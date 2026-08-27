"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SplitRecipientInput } from "@/lib/admin-api";
import { listSplits, createSplit } from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  Field,
  Button,
  SecondaryButton,
  inputClass,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function SplitsPage() {
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <SplitsInner token={token as string} />
    </RequireAdmin>
  );
}

function SplitsInner({ token }: { token: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const splits = useQuery({
    queryKey: ["revenue-splits"],
    queryFn: () => listSplits(token),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Revenue splits
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configs that apportion revenue. Recipient basis points must sum to
            10000 and the total is shown per config.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" />
          New split
        </Button>
      </div>

      {showCreate && (
        <CreateSplitForm token={token} onDone={() => setShowCreate(false)} />
      )}

      <Card>
        <CardHeader title={`${splits.data?.length ?? 0} configs`} />
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {splits.data?.map((split) => (
            <Link
              key={split.id}
              href={`/admin/splits/${split.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-gray-50">
                  {split.name}
                </p>
                {split.description && (
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {split.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {split.totalBasisPoints} bps
                </Badge>
                <Badge
                  className={
                    split.active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }
                >
                  {split.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Link>
          ))}
          {!splits.isLoading && (splits.data?.length ?? 0) === 0 && (
            <p className="px-5 py-8 text-center text-gray-400">
              No revenue split configs yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function CreateSplitForm({ token, onDone }: { token: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<SplitRecipientInput[]>([]);

  const addRecipient = () =>
    setRecipients((r) => [
      ...r,
      { label: "", basisPoints: 0, accountId: "", externalAddress: "" },
    ]);

  const updateRecipient = (idx: number, patch: Partial<SplitRecipientInput>) =>
    setRecipients((r) =>
      r.map((rec, i) => (i === idx ? { ...rec, ...patch } : rec)),
    );

  const removeRecipient = (idx: number) =>
    setRecipients((r) => r.filter((_, i) => i !== idx));

  const totalBps = recipients.reduce((sum, r) => sum + (r.basisPoints || 0), 0);
  const sumError =
    recipients.length > 0 && totalBps !== 10000;

  const create = useMutation({
    mutationFn: () =>
      createSplit(token, {
        name,
        description: description || undefined,
        recipients: recipients.map((r) => ({
          label: r.label,
          basisPoints: r.basisPoints,
          ...(r.accountId ? { accountId: r.accountId } : {}),
          ...(r.externalAddress ? { externalAddress: r.externalAddress } : {}),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-splits"] });
      toast.success("Split created");
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader title="Create a revenue split config" />
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-gray-50">
              Recipients
            </h3>
            <SecondaryButton type="button" onClick={addRecipient} className="px-2.5 py-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </SecondaryButton>
          </div>
          {recipients.map((rec, idx) => (
            <div key={idx} className="grid gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-12 dark:border-gray-800">
              <input
                className={`${inputClass} sm:col-span-3`}
                placeholder="Label"
                value={rec.label}
                onChange={(e) => updateRecipient(idx, { label: e.target.value })}
                required
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                type="number"
                min={1}
                placeholder="Basis points"
                value={rec.basisPoints || ""}
                onChange={(e) =>
                  updateRecipient(idx, { basisPoints: Number(e.target.value) })
                }
                required
              />
              <input
                className={`${inputClass} sm:col-span-3`}
                placeholder="Account ID (uuid)"
                value={rec.accountId ?? ""}
                onChange={(e) => updateRecipient(idx, { accountId: e.target.value })}
              />
              <input
                className={`${inputClass} sm:col-span-3`}
                placeholder="Or external address"
                value={rec.externalAddress ?? ""}
                onChange={(e) => updateRecipient(idx, { externalAddress: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeRecipient(idx)}
                className="self-center justify-self-start text-sm text-red-600 hover:text-red-700 sm:col-span-1 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          {recipients.length > 0 && (
            <p
              className={
                sumError
                  ? "text-sm font-medium text-red-600 dark:text-red-400"
                  : "text-sm text-gray-500 dark:text-gray-400"
              }
            >
              Total: {totalBps} basis points (must be exactly 10000).
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending || sumError || recipients.length === 0}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
          <SecondaryButton type="button" onClick={onDone}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </Card>
  );
}
