"use client";

import { useEffect, useState } from "react";
import {
  getWalletStatus,
  provisionCustodialWallet,
  requestLinkChallenge,
  verifyLinkChallenge,
  type WalletStatusResponse,
} from "@/lib/wallet-api";

function formatBalance(minorUnits: number, currency: string): string {
  return `${(minorUnits / 10_000_000).toFixed(2)} ${currency} credit`;
}

/**
 * Onboarding / settings widget for a user's payment wallet. Framed as a
 * store-credit balance, not a crypto wallet — the raw address only shows
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
  const [linkAddress, setLinkAddress] = useState("");
  const [linkSignature, setLinkSignature] = useState("");

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

  async function handleVerifyLink() {
    if (!nonce) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyLinkChallenge(accessToken, {
        nonce,
        address: linkAddress.trim(),
        signature: linkSignature.trim(),
      });
      setStatus(result);
      setLinking(false);
      setNonce(null);
      setLinkAddress("");
      setLinkSignature("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        Loading your wallet…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
      <h2 className="text-lg font-semibold">Your balance</h2>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!status?.provisioned && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You don&apos;t have a payment balance set up yet. We&apos;ll create
            one for you automatically the first time you need it — no
            downloads or extra passwords required.
          </p>
          <button
            type="button"
            onClick={handleGetStarted}
            disabled={busy}
            className="rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Setting up…" : "Get started"}
          </button>
        </div>
      )}

      {status?.provisioned && (
        <div className="space-y-3">
          <p className="text-2xl font-semibold">
            {formatBalance(status.balance, status.currency)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {status.custodyType === "CUSTODIAL"
              ? "This works like a store credit balance — we hold it for you and you spend it on bookings."
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
            <button
              type="button"
              onClick={handleRequestLink}
              disabled={busy}
              className="text-sm underline text-gray-600 dark:text-gray-400 disabled:opacity-50"
            >
              Connect a wallet you already own instead
            </button>
          )}
        </div>
      )}

      {linking && nonce && (
        <div className="space-y-3 border-t border-gray-200 dark:border-gray-800 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            In your wallet app, sign this one-time code, then paste your
            address and the resulting signature below.
          </p>
          <p className="break-all rounded bg-gray-100 dark:bg-gray-900 p-2 font-mono text-xs">
            {nonce}
          </p>
          <input
            type="text"
            placeholder="Wallet address"
            value={linkAddress}
            onChange={(e) => setLinkAddress(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Signature"
            value={linkSignature}
            onChange={(e) => setLinkSignature(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVerifyLink}
              disabled={busy || !linkAddress || !linkSignature}
              className="rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Connect wallet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLinking(false);
                setNonce(null);
              }}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            If you lose access to this wallet, we cannot recover it for you —
            we never hold the keys to a connected wallet.
          </p>
        </div>
      )}
    </div>
  );
}
