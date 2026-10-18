"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { listManualReviewPayments } from "@/lib/payments-api";
import type { Payment } from "@/lib/payments-api";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
} from "@/components/admin/ui";
import { RequireAdmin } from "@/components/admin/require-admin";

// Payment amounts arrive as integer minor units.
function formatAmount(amount: number, currency: string): string {
  return formatCurrency(fromMinorUnits(amount, currency), currency);
}

const PAGE_SIZE = 25;

export default function AdminManualReviewPage() {
  return (
    <RequireAdmin>
      <ManualReviewInner />
    </RequireAdmin>
  );
}

function ManualReviewInner() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["manual-review-payments", offset],
    queryFn: () => listManualReviewPayments(PAGE_SIZE, offset),
    refetchInterval: 30_000,
  });

  const payments = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Manual-review queue
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Payments escalated to MANUAL_REVIEW — use the action buttons on
            each detail page to force-reconcile, resolve, or void.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title={isLoading ? "Loading…" : `${total} payment${total === 1 ? "" : "s"} awaiting review`}
          description="Auto-refreshes every 30 seconds."
        />

        {error ? (
          <p className="px-5 py-6 text-sm text-red-600 dark:text-red-400">
            {(error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Payment ID</th>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Rail</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Review reason</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map((p: Payment) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {p.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {p.bookingId.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3">
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                        {p.rail}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate text-gray-500 dark:text-gray-400">
                      {p.manualReviewReason ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/payments/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        Review <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!isLoading && payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      No payments in the manual-review queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-sm dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">
              Showing {total === 0 ? 0 : offset + 1}–
              {Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                disabled={!hasPrevious}
                className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={!hasNext}
                className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
