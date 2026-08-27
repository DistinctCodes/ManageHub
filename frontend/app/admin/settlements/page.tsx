"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Play } from "lucide-react";
import type { SettlementBatchStatus } from "@/lib/admin-api";
import { listBatches, runSettlement } from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

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
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <SettlementsInner token={token as string} />
    </RequireAdmin>
  );
}

function SettlementsInner({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const status =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("status") ?? ""
      : "";

  const batches = useQuery({
    queryKey: ["settlement-batches", status],
    queryFn: () =>
      listBatches(token, (status || undefined) as SettlementBatchStatus | undefined),
  });

  const run = useMutation({
    mutationFn: () => runSettlement(token),
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
        <CardHeader title={`${batches.data?.length ?? 0} batches`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Currency</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Entries</th>
                <th className="px-5 py-3">Period end</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {batches.data?.map((batch) => (
                <tr
                  key={batch.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = `/admin/settlements/${batch.id}`;
                    }
                  }}
                >
                  <td className="px-5 py-3">
                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      {batch.mode}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={batch.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                    {batch.currency}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {batch.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {batch.claimedEntryCount}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(batch.periodEnd).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!batches.isLoading && (batches.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No settlement batches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
