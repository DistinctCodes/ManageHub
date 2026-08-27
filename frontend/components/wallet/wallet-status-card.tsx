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
import { useSessionStore } from "@/lib/stores/session-store";

function formatBalance(minorUnits: number, currency: string): string {
  return `${(minorUnits / 10_000_000).toFixed(2)} ${currency} credit`;
}

/**
 * Onboarding / settings widget for a user's payment wallet. Framed as a
 * store-credit balance, not a crypto wallet - the raw address only shows
 * up behind the "Advanced" disclosure, and a "connect your own wallet"
 * option is always available for someone who wants self-custody instead.
 */
export function WalletStatusCard({ accessToken }: { accessToken: string }) {
  const queryClient = useQueryClient();
  const setAccessToken = useSessionStore((state) => state.setAccessToken);
  const [linking, setLinking] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);

  const {
    data: status,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["wallet", "status"],
    queryFn: () => getWalletStatus(accessToken),
  });

  function applyStatus(result: WalletStatusResponse) {
    queryClient.setQueryData<WalletStatusResponse>(["wallet", "status"], result);
  }

  const provision = useMutation({
    mutationFn: () => provisionCustodialWallet(accessToken),
    onSuccess: applyStatus,
  });

  const challenge = useMutation({
    mutationFn: () => requestLinkChallenge(accessToken),
    onSuccess: (result) => {
      setNonce(result.nonce);
      setLinking(true);
    },
  });

  const verify = useMutation({
    mutationFn: (values: { address: string; signature: string }) =>
      verifyLinkChallenge(accessToken, {
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

  if (loading) {
    return (
      <Card>
        <CardContent>Loading your wallet...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your balance</CardTitle>
        <Button variant="link" onClick={() => setAccessToken(null)}>
          Sign out
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
