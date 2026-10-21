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
import { DataTable } from "@/components/admin/data-table";
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

        <DataTable
          columns={[
            { key: "id", header: "Payment ID", render: (payment) => (
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{(payment as Payment).id.slice(0, 8)}…</span>
            ) },
            { key: "bookingId", header: "Booking", render: (payment) => (
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{(payment as Payment).bookingId.slice(0, 8)}…</span>
            ) },
            { key: "rail", header: "Rail", render: (payment) => (
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                {(payment as Payment).rail}
              </Badge>
            ) },
            { key: "status", header: "Status", render: (payment) => <StatusBadge status={(payment as Payment).status} /> },
            { key: "amount", header: "Amount", className: "text-right tabular-nums", render: (payment) => formatAmount((payment as Payment).amount, (payment as Payment).currency) },
            { key: "manualReviewReason", header: "Review reason", render: (payment) => (
              <span className="max-w-xs truncate text-gray-500 dark:text-gray-400">{(payment as Payment).manualReviewReason ?? "—"}</span>
            ) },
            { key: "createdAt", header: "Created", render: (payment) => (
              <span className="text-gray-500 dark:text-gray-400">{new Date((payment as Payment).createdAt).toLocaleDateString()}</span>
            ) },
          ]}
          rows={payments}
          rowKey={(payment) => (payment as Payment).id}
          loading={isLoading}
          error={error ? <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p> : undefined}
          empty={<span>No payments in the manual-review queue.</span>}
          page={Math.floor(offset / PAGE_SIZE) + 1}
          pageSize={PAGE_SIZE}
          totalRows={total}
          onPageChange={(nextPage) => setOffset((nextPage - 1) * PAGE_SIZE)}
          rowActions={(payment) => (
            <Link
              href={`/admin/payments/${(payment as Payment).id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              Review <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        />
      </Card>
    </div>
  );
}
