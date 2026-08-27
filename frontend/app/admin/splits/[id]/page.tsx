"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Power, StopCircle } from "lucide-react";
import {
  listSplits,
  setSplitActive,
  previewSplit,
} from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Field,
  Button,
  inputClass,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function SplitDetailPage() {
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <SplitDetailInner token={token as string} />
    </RequireAdmin>
  );
}

function SplitDetailInner({ token }: { token: string }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const configs = useQuery({
    queryKey: ["revenue-splits"],
    queryFn: () => listSplits(token),
  });
  const split = configs.data?.find((c) => c.id === id);

  const [amount, setAmount] = useState("10000");

  const preview = useQuery({
    queryKey: ["split-preview", id, amount],
    queryFn: () => previewSplit(token, id, Number(amount) || 0),
    enabled: !!split && Number(amount) > 0,
  });

  const toggleActive = useMutation({
    mutationFn: () => setSplitActive(token, id, !split?.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-splits"] });
      toast.success(`Config ${split?.active ? "deactivated" : "activated"}`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (configs.isLoading) {
    return <Card className="p-6 text-sm text-gray-500">Loading…</Card>;
  }

  if (!split) {
    return (
      <Card className="p-6 text-sm text-red-600 dark:text-red-400">
        Revenue split config not found.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            {split.name}
          </h1>
          {split.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {split.description}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={() => toggleActive.mutate()}
          disabled={toggleActive.isPending}
          className={split.active ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          {split.active ? (
            <>
              <StopCircle className="h-4 w-4" /> Deactivate
            </>
          ) : (
            <>
              <Power className="h-4 w-4" /> Activate
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Recipients"
          action={
            <StatusBadge status={split.active ? "ACTIVE" : "PENDING"} />
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Label</th>
                <th className="px-5 py-3 text-right">Basis points</th>
                <th className="px-5 py-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {split.recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-50">
                    {recipient.label}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {recipient.basisPoints}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {recipient.accountId ??
                      recipient.externalAddress ??
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Allocation preview" description="Posts nothing — shows the largest-remainder allocation." />
        <form
          className="flex max-w-md items-end gap-3 p-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <Field label="Amount (minor units)">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Button type="button" onClick={() => preview.refetch()} disabled={preview.isFetching}>
            {preview.isFetching ? "…" : "Preview"}
          </Button>
        </form>
        {preview.data && (
          <div className="px-5 pb-5">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              Allocated {preview.data.allocatedTotal.toLocaleString()} of{" "}
              {preview.data.amount.toLocaleString()} — no remainder is dropped.
            </p>
            <ol className="space-y-2">
              {preview.data.shares.map((share) => (
                <li
                  key={share.recipientId}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-2 text-sm dark:border-gray-800"
                >
                  <span className="text-gray-900 dark:text-gray-50">
                    {share.label}
                  </span>
                  <span className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {share.basisPoints} bps
                    </Badge>
                    <span className="tabular-nums">
                      {share.amount.toLocaleString()}
                    </span>
                    {share.remainderUnits > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        +{share.remainderUnits} remainder
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </div>
  );
}
