"use client";

import { WalletStatusCard } from "@/components/wallet/wallet-status-card";
import { useSessionStore } from "@/lib/stores/session-store";

export default function WalletPage() {
  const accessToken = useSessionStore((state) => state.accessToken);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Wallet</h1>
      {accessToken ? (
        <WalletStatusCard accessToken={accessToken} />
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sign in to see your balance.
        </p>
      )}
    </main>
  );
}
