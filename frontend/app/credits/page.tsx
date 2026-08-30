"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Cookies from "js-cookie";
import { getCreditBalance, getCreditStatement } from "@/lib/credits-api";
import type { CreditStatementEntry } from "@/lib/credits-api";

const PAGE_SIZE = 20;

function useAccessToken(): string | null {
  return Cookies.get("accessToken") ?? null;
}

export default function CreditsPage() {
  const token = useAccessToken();

  if (!token) {
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

  return <CreditsInner token={token} />;
}

function CreditsInner({ token }: { token: string }) {
  const [page, setPage] = useState(1);

  const balance = useQuery({
    queryKey: ["credit-balance"],
    queryFn: () => getCreditBalance(token),
  });

  const statement = useQuery({
    queryKey: ["credit-statement", page],
    queryFn: () => getCreditStatement(token, page, PAGE_SIZE),
  });

  const totalPages = statement.data
    ? Math.ceil(statement.data.total / PAGE_SIZE)
    : 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">Available balance</p>
            {balance.isLoading ? (
              <p className="mt-2 text-4xl font-bold tracking-tight">—</p>
            ) : balance.error ? (
              <p className="mt-2 text-sm text-red-300">
                {(balance.error as Error).message}
              </p>
            ) : (
              <>
                <p className="mt-2 text-4xl font-bold tracking-tight">
                  {balance.data!.balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="ml-2 text-xl font-normal text-blue-200">
                    {balance.data!.currency}
                  </span>
                </p>
                {balance.data!.overdraftLimit > 0 && (
                  <p className="mt-1 text-xs text-blue-200">
                    Overdraft limit: {balance.data!.overdraftLimit.toLocaleString()} {balance.data!.currency}
                  </p>
                )}
              </>
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
          ) : statement.isLoading ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Loading…
            </p>
          ) : (statement.data?.entries.length ?? 0) === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-400">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {statement.data!.entries.map((entry: CreditStatementEntry) => (
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
                    {entry.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {entry.currency}
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
