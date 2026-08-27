"use client";

import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<WalletStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWalletStatus(accessToken)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function handleGetStarted() {
    setBusy(true);
    setError(null);
    try {
      const result = await provisionCustodialWallet(accessToken);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestLink() {
    setBusy(true);
    setError(null);
    try {
      const challenge = await requestLinkChallenge(accessToken);
      setNonce(challenge.nonce);
      setLinking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyLink(values: {
    address: string;
    signature: string;
  }) {
    if (!nonce) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyLinkChallenge(accessToken, {
        nonce,
        address: values.address,
        signature: values.signature,
      });
      setStatus(result);
      setLinking(false);
      setNonce(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>Loading your wallet...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!status?.provisioned && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You don&apos;t have a payment balance set up yet. We&apos;ll
              create one for you automatically the first time you need it - no
              downloads or extra passwords required.
            </p>
            <Button onClick={handleGetStarted} disabled={busy}>
              {busy ? "Setting up..." : "Get started"}
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
                onClick={handleRequestLink}
                disabled={busy}
              >
                {busy ? "Requesting..." : "Connect a wallet you already own instead"}
              </Button>
            )}
          </div>
        )}

        {linking && nonce && (
          <WalletLinkForm
            nonce={nonce}
            busy={busy}
            onCancel={() => {
              setLinking(false);
              setNonce(null);
            }}
            onSubmit={handleVerifyLink}
          />
        )}
      </CardContent>
    </Card>
  );
}
