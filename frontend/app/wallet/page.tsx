"use client";

import { WalletStatusCard } from "@/components/wallet/wallet-status-card";

export default function WalletPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Wallet</h1>
      <WalletStatusCard />
    </main>
  );
}
