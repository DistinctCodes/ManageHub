"use client";

import { WalletStatusCard } from "@/components/wallet/wallet-status-card";
import { UserMenu } from "@/components/auth/user-menu";

export default function WalletPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wallet</h1>
        <UserMenu />
      </div>
      <WalletStatusCard />
    </main>
  );
}
