"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Play, RotateCcw, Ban } from "lucide-react";
import {
  getBatchBreakdown,
  executeBatch,
  retryBatch,
  abandonBatch,
} from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Button,
  SecondaryButton,
  Field,
  inputClass,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function BatchDetailPage() {
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <BatchDetailInner token={token as string} />
    </RequireAdmin>
  );
}

function BatchDetailInner({ token }: { token: string }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [abandonReason, setAbandonReason] = useState("");

  const detail = useQuery({
    queryKey: ["settlement-batch", id],
    queryFn: () => getBatchBreakdown(token, id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["settlement-batch", id] });

  const execute = useMutation({
    mutationFn: () => executeBatch(token, id),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });
  const retry = useMutation({
    mutationFn: () => retryBatch(token, id),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });
  const abandon = useMutation({
    mutationFn: () => abandonBatch(token, id, abandonReason),
    onSuccess: () => {
      toast.success("Batch abandoned");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (detail.isLoading) {
    return <Card className="p-6 text-sm text-gray-500">Loading…</Card>;
  }

  if (detail.error) {
    return (
      <Card className="p-6 text-sm text-red-600 dark:text-red-400">
        {detail.error.message}
      </Card>
    );
  }

  const { batch, payouts, entries } = detail.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Batch breakdown
          </h1>
          <p className="mt-1 flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
            {batch.id}
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              {batch.mode}
            </Badge>
            <StatusBadge status={batch.status} />
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => execute.mutate()}
            disabled={execute.isPending}
          >
            <Play className="h-4 w-4" />
            {execute.isPending ? "…" : "Advance"}
          </Button>
          <SecondaryButton type="button" onClick={() => retry.mutate()} disabled={retry.isPending}>
            <RotateCcw className="h-4 w-4" />
            Retry failed
          </SecondaryButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Total amount</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
            {batch.totalAmount.toLocaleString()}{" "}
            <span className="text-sm font-normal text-gray-500">{batch.currency}</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Claimed entries</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
            {batch.claimedEntryCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Payouts</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
            {payouts.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Payouts" description="Per recipient leg and its on-chain reference." />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Label</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">On-chain ref</th>
                <th className="px-5 py-3 text-right">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-50">
                    {payout.label}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {payout.externalAddress ?? payout.accountId ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {payout.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={payout.status} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {payout.onChainReference ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {payout.attempts}
                    {payout.lastError && (
                      <p className="text-xs text-red-500">{payout.lastError}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Claimed ledger entries (${entries.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {entry.accountId}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      className={
                        entry.direction === "CREDIT"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                      }
                    >
                      {entry.direction}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {entry.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Abandon batch" description="Give up on failed payouts and release their unsettled claims." />
        <form
          className="flex max-w-xl items-end gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            abandon.mutate();
          }}
        >
          <Field label="Reason (required)">
            <input
              className={inputClass}
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
              required
            />
          </Field>
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700"
            disabled={abandon.isPending}
          >
            <Ban className="h-4 w-4" />
            {abandon.isPending ? "…" : "Abandon"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
