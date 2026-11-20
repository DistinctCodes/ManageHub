"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserMenu } from "@/components/auth/user-menu";
import {
  getCreditBalance,
  getCreditStatement,
  getMyAccounts,
} from "@/lib/credits-api";
import type { CreditStatementEntry } from "@/lib/credits-api";
import {
  formatCurrency,
  fromMinorUnits,
  minorUnitDecimals,
} from "@/lib/utils";

// Credit balances and statement amounts arrive as integer minor units.
function formatMinorAmount(amount: number, currency: string): string {
  return formatCurrency(fromMinorUnits(amount, currency), currency);
}

const PAGE_SIZE = 20;

export default function CreditsPage() {
  useSessionBootstrap();
  const user = useSessionStore((state) => state.user);
  const sessionStatus = useSessionStore((state) => state.status);

  if (sessionStatus === "unknown") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Checking your session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm rounded-xl border border-dashed border-gray-300 px-8 py-12 text-center dark:border-gray-700">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Sign in to view your credits
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your credit balance and transaction history will appear here once you are signed in.
          </p>
        </div>
      </div>
    );
  }

  return <CreditsInner />;
}

function CreditsInner() {
  const [page, setPage] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState("");

  const accounts = useQuery({
    queryKey: ["credit-accounts"],
    queryFn: () =>
      typeof getMyAccounts === "function" ? getMyAccounts() : Promise.resolve([]),
  });

  const currencies = Array.from(
    new Set((accounts.data ?? []).map((account) => account.currency)),
  ).sort();
  const currency =
    selectedCurrency && currencies.includes(selectedCurrency)
      ? selectedCurrency
      : (currencies[0] ?? "");

  const balance = useQuery({
    queryKey: ["credit-balance", currency || null],
    queryFn: () => getCreditBalance(currency || undefined),
    enabled: !accounts.isLoading,
  });

  const statement = useQuery({
    queryKey: ["credit-statement", page, currency || null],
    queryFn: () => getCreditStatement(page, PAGE_SIZE, currency || undefined),
    enabled: !accounts.isLoading,
  });

  const entries = statement.data?.entries ?? [];
  const totalPages = statement.data
    ? Math.ceil(statement.data.total / PAGE_SIZE)
    : 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Currency
          <select
            aria-label="Currency"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
            value={currency}
            onChange={(event) => {
              setSelectedCurrency(event.target.value);
              setPage(1);
            }}
            disabled={currencies.length === 0}
          >
            {currencies.length === 0 ? (
              <option value="">No accounts</option>
            ) : (
              currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))
            )}
          </select>
        </label>
        <UserMenu />
      </div>
      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">Available balance</p>
            {accounts.isPending || balance.isPending ? (
              <p className="mt-2 text-4xl font-bold tracking-tight">—</p>
            ) : balance.error ? (
              <p className="mt-2 text-sm text-red-300">
                {(balance.error as Error).message}
              </p>
            ) : balance.data ? (
              <>
                <p className="mt-2 text-4xl font-bold tracking-tight">
                  {fromMinorUnits(balance.data.balance, balance.data.currency).toLocaleString(undefined, {
                    minimumFractionDigits: minorUnitDecimals(balance.data.currency),
                    maximumFractionDigits: minorUnitDecimals(balance.data.currency),
                  })}
                  <span className="ml-2 text-xl font-normal text-blue-200">
                    {balance.data.currency}
                  </span>
                </p>
                {balance.data.overdraftLimit > 0 && (
                  <p className="mt-1 text-xs text-blue-200">
                    Overdraft limit: {formatMinorAmount(balance.data.overdraftLimit, balance.data.currency)}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-4xl font-bold tracking-tight">—</p>
            )}
          </div>
          <Wallet className="h-8 w-8 text-blue-200 opacity-70" />
        </div>
      </div>

      {/* Statement */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Transaction history
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your full credit ledger, newest first.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {statement.error ? (
            <p className="px-5 py-8 text-center text-sm text-red-500">
              {(statement.error as Error).message}
            </p>
          ) : accounts.isLoading || statement.isLoading ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Loading…
            </p>
          ) : entries.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-400">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((entry: CreditStatementEntry) => (
                <li key={entry.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      entry.direction === "CREDIT"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
                    }`}
                  >
                    {entry.direction === "CREDIT" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                      {entry.description ?? entry.kind}
                    </p>
                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                      {entry.reference} · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      entry.direction === "CREDIT"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {entry.direction === "CREDIT" ? "+" : "−"}
                    {formatMinorAmount(entry.amount, entry.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
