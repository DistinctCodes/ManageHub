"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, StatusBadge } from "@/components/app-ui";
import {
  listMyUsage,
  type MeteredUsageEvent,
  type MeteredUsagePage,
} from "@/lib/payments-api";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserMenu } from "@/components/auth/user-menu";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

// Usage event amounts (and per-unit prices) arrive as integer minor units.
function formatMoney(amount: number, currency: string) {
  return formatCurrency(fromMinorUnits(amount, currency), currency || "USD");
}

export default function UsagePage() {
  useSessionBootstrap();
  const user = useSessionStore((state) => state.user);
  const sessionStatus = useSessionStore((state) => state.status);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const query = useInfiniteQuery({
    queryKey: ["my-usage", from, to],
    queryFn: ({ pageParam }) =>
      listMyUsage({
        cursor: pageParam ?? undefined,
        from: from || undefined,
        to: to || undefined,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MeteredUsagePage) =>
      lastPage.nextCursor ?? undefined,
    enabled: Boolean(user),
  });

  useEffect(() => {
    setPageIndex(0);
  }, [from, to]);

  const pages = query.data?.pages ?? [];
  const page = pages[pageIndex];
  const events = page?.data ?? [];
  const hasNext = pageIndex < pages.length - 1 || Boolean(query.hasNextPage);

  async function goNext() {
    if (!hasNext) return;
    if (pageIndex + 1 >= pages.length) {
      await query.fetchNextPage();
    }
    setPageIndex((index) => index + 1);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center justify-end">
        <UserMenu />
      </div>
      <Card>
        <CardHeader title="Usage history" description="Your metered usage, newest first." />
        <div className="px-5 py-4">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Clear range
              </button>
            )}
          </div>

          {sessionStatus === "unknown" ? (
            <p className="text-sm text-gray-500">Checking your session...</p>
          ) : !user ? (
            <p className="text-sm text-amber-600">Sign in to view usage.</p>
          ) : query.isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : query.error ? (
            <p className="text-sm text-red-600">{(query.error as Error).message}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">No usage recorded.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {events.map((event: MeteredUsageEvent) => (
                  <li key={event.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {event.resource} · {event.units} units @{" "}
                        {formatMoney(event.unitPrice, event.currency)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {event.usageReference} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {formatMoney(event.amount, event.currency)}
                      </span>
                      <StatusBadge
                        status={event.charged ? "CONFIRMED" : "PENDING"}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {(pageIndex > 0 || hasNext) && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((index) => index - 1)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {pageIndex + 1}
                  </span>
                  <button
                    type="button"
                    disabled={!hasNext || query.isFetchingNextPage}
                    onClick={goNext}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
                  >
                    {query.isFetchingNextPage ? "Loading…" : "Next"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
