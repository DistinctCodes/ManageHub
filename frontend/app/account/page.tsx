import type { Metadata } from "next";
import { AccountSettings } from "@/components/auth/account-settings";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 border-b border-gray-200 pb-5 dark:border-gray-800">
        <p className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-400">ManageHub</p>
        <h1 className="mt-2 text-2xl font-semibold">Account</h1>
      </header>
      <AccountSettings />
    </main>
  );
}