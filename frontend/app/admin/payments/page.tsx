"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { listManualReviewPayments } from "@/lib/payments-api";
import type { Payment } from "@/lib/payments-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function AdminManualReviewPage() {
  const token = useAdminToken();
  return (
    <RequireAdmin>
      <ManualReviewInner token={token as string} />
    </RequireAdmin>
  );
}

function ManualReviewInner({ token }: { token: string }) {
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ["manual-review-payments"],
    queryFn: () => listManualReviewPayments(token),
    refetchInterval: 30_000,
  });

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
          title={isLoading ? "Loading…" : `${payments?.length ?? 0} payment${(payments?.length ?? 0) === 1 ? "" : "s"} awaiting review`}
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
                {payments?.map((p: Payment) => (
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
                      {p.amount.toLocaleString()} {p.currency}
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
                {!isLoading && (payments?.length ?? 0) === 0 && (
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
      </Card>
    </div>
  );
}
