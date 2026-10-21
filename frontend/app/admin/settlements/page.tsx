"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Play } from "lucide-react";
import type { SettlementBatch, SettlementBatchStatus } from "@/lib/admin-api";
import { listBatches, runSettlement } from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
} from "@/components/admin/ui";
import { DataTable } from "@/components/admin/data-table";
import { RequireAdmin } from "@/components/admin/require-admin";
import { SettlementVolumeChart } from "@/components/admin/settlement-volume-chart";

const STATUSES: Array<{ value: SettlementBatchStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SETTLED", label: "Settled" },
  { value: "PARTIALLY_SETTLED", label: "Partially settled" },
  { value: "FAILED", label: "Failed" },
  { value: "ABANDONED", label: "Abandoned" },
];

export default function SettlementsPage() {
  return (
    <RequireAdmin>
      <SettlementsInner />
    </RequireAdmin>
  );
}

function SettlementsInner() {
  const queryClient = useQueryClient();
  const status =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("status") ?? ""
      : "";

  const batches = useQuery({
    queryKey: ["settlement-batches", status],
    queryFn: () =>
      listBatches((status || undefined) as SettlementBatchStatus | undefined),
  });

  const rows = Array.isArray(batches.data)
    ? batches.data
    : batches.data?.data ?? [];
  const chartData = Array.isArray(batches.data)
    ? batches.data
    : batches.data?.data ?? [];

  const run = useMutation({
    mutationFn: () => runSettlement(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement-batches"] });
      toast.success("Settlement pass completed");
    },
    onError: (err) => toast.error(err.message),
  });

  const filterLink = (s: string) => (s ? `?status=${s}` : "/admin/settlements");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Settlement pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Settlement batches — entries in, recipients out, per-leg on-chain
            references.
          </p>
        </div>
        <Button type="button" onClick={() => run.mutate()} disabled={run.isPending}>
          <Play className="h-4 w-4" />
          {run.isPending ? "Running…" : "Run settlement now"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(({ value, label }) => (
          <FilterPill
            key={value || "all"}
            href={filterLink(value)}
            active={status === value}
            label={label}
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title="Settlement volume by status"
          description="Total settled amount aggregated across all batches by current status."
        />
        <SettlementVolumeChart batches={chartData} />
      </Card>

      <Card>
        <CardHeader title={`${rows.length} batches`} />
        <DataTable
          columns={[
            { key: "mode", header: "Mode", render: (batch) => (
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                {(batch as SettlementBatch).mode}
              </Badge>
            ) },
            { key: "status", header: "Status", render: (batch) => <StatusBadge status={(batch as SettlementBatch).status} /> },
            { key: "currency", header: "Currency", render: (batch) => (batch as SettlementBatch).currency },
            { key: "totalAmount", header: "Total", className: "text-right tabular-nums", render: (batch) => (batch as SettlementBatch).totalAmount.toLocaleString() },
            { key: "claimedEntryCount", header: "Entries", className: "text-right tabular-nums", render: (batch) => (batch as SettlementBatch).claimedEntryCount },
            { key: "periodEnd", header: "Period end", render: (batch) => new Date((batch as SettlementBatch).periodEnd).toLocaleDateString() },
          ]}
          rows={rows}
          rowKey={(batch) => (batch as SettlementBatch).id}
          loading={batches.isLoading}
          error={batches.error ? <p role="alert" className="text-sm text-red-600">{(batches.error as Error).message}</p> : undefined}
          empty={<span>No settlement batches.</span>}
          onRowClick={(row) => {
            if (typeof window !== "undefined") {
              window.location.href = `/admin/settlements/${(row as SettlementBatch).id}`;
            }
          }}
        />
      </Card>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      }
    >
      {label}
    </Link>
  );
}
