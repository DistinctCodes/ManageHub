"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWalletStatus,
  provisionCustodialWallet,
  requestLinkChallenge,
  verifyLinkChallenge,
  type WalletStatusResponse,
} from "@/lib/wallet-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WalletLinkForm } from "@/components/wallet/wallet-link-form";
import { fromMinorUnits } from "@/lib/utils";
import { useSignOut } from "@/components/auth/use-sign-out";

// Minor-unit conversion (and the currency exponent table it uses) lives in
// lib/utils.ts so every money surface parses amounts the same way. The
// formatBalance contract tested by __tests__/format-balance.test.ts is
// unchanged: "<value>.<2 digits> <CURRENCY> credit".
export function formatBalance(minorUnits: number, currency: string): string {
  return `${fromMinorUnits(minorUnits, currency).toFixed(2)} ${currency} credit`;
}

/**
 * Onboarding / settings widget for a user's payment wallet. Framed as a
 * store-credit balance, not a crypto wallet - the raw address only shows
 * up behind the "Advanced" disclosure, and a "connect your own wallet"
 * option is always available for someone who wants self-custody instead.
 */
export function WalletStatusCard() {
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const [linking, setLinking] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);

  const {
    data: status,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["wallet", "status"],
    queryFn: () => getWalletStatus(),
  });

  function applyStatus(result: WalletStatusResponse) {
    queryClient.setQueryData<WalletStatusResponse>(["wallet", "status"], result);
  }

  const provision = useMutation({
    mutationFn: () => provisionCustodialWallet(),
    onSuccess: applyStatus,
  });

  const challenge = useMutation({
    mutationFn: () => requestLinkChallenge(),
    onSuccess: (result) => {
      setNonce(result.nonce);
      setLinking(true);
    },
  });

  const verify = useMutation({
    mutationFn: (values: { address: string; signature: string }) =>
      verifyLinkChallenge({
        nonce: nonce ?? "",
        address: values.address,
        signature: values.signature,
      }),
    onSuccess: (result) => {
      applyStatus(result);
      setLinking(false);
      setNonce(null);
    },
  });

  const pending =
    provision.isPending || challenge.isPending || verify.isPending;
  const errorMessage =
    error?.message ?? provision.error?.message ?? verify.error?.message;

  const statusMessage = loading
    ? "Loading your wallet…"
    : errorMessage
      ? errorMessage
      : pending
        ? "Working…"
        : status?.provisioned
          ? "Wallet balance loaded."
          : "No wallet set up yet.";

  if (loading) {
    return (
      <Card aria-busy="true">
        <div aria-live="polite" role="status" className="sr-only">
          Loading your wallet status...
        </div>
        {/* Skeleton mirrors the loaded card's layout (header row, balance,
            supporting text, advanced disclosure, and action button) so the
            swap to the real content doesn't cause a layout jump. */}
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-8 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-full max-w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your balance</CardTitle>
        <Button variant="link" onClick={() => signOut()}>
          Sign out
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/*
          Visually-hidden live region so loading/error/pending/success
          transitions are announced to assistive technology as they happen,
          independent of where the corresponding visible text sits in the
          DOM (see FE-123).
        */}
        <div aria-live="polite" role="status" className="sr-only">
          {statusMessage}
        </div>

        {errorMessage && (
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        )}

        {!status?.provisioned && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You don&apos;t have a payment balance set up yet. We&apos;ll
              create one for you automatically the first time you need it - no
              downloads or extra passwords required.
            </p>
            <Button onClick={() => provision.mutate()} disabled={pending}>
              {provision.isPending ? "Setting up..." : "Get started"}
            </Button>
          </div>
        )}

        {status?.provisioned && (
          <div className="space-y-3">
            <p className="text-2xl font-semibold">
              {formatBalance(status.balance, status.currency)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {status.custodyType === "CUSTODIAL"
                ? "This works like a store credit balance - we hold it for you and you spend it on bookings."
                : "This balance lives in a wallet you control."}
            </p>

            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
                Advanced
              </summary>
              <p className="mt-2 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                {status.walletAddress}
              </p>
            </details>

            {status.custodyType === "CUSTODIAL" && !linking && (
              <Button
                variant="link"
                onClick={() => challenge.mutate()}
                disabled={pending}
              >
                {challenge.isPending ? "Requesting..." : "Connect a wallet you already own instead"}
              </Button>
            )}
          </div>
        )}

        {linking && nonce && (
          <WalletLinkForm
            nonce={nonce}
            busy={verify.isPending}
            onCancel={() => {
              setLinking(false);
              setNonce(null);
            }}
            onSubmit={(values) => verify.mutate(values)}
          />
        )}
      </CardContent>
    </Card>
  );
}
