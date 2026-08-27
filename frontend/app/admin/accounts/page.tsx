"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Snowflake, Unlock } from "lucide-react";
import type { LedgerAccount, LedgerAccountKind } from "@/lib/admin-api";
import { listAccounts, createAccount, updateAccount } from "@/lib/admin-api";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Field,
  Button,
  SecondaryButton,
  inputClass,
} from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

const KINDS: LedgerAccountKind[] = [
  "USER",
  "TREASURY",
  "REVENUE",
  "PLATFORM_FEE",
  "HUB_OPERATOR",
  "REFERRAL",
];

export default function AccountsPage() {
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <AccountsInner token={token as string} />
    </RequireAdmin>
  );
}

function AccountsInner({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const accounts = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: () => listAccounts(token),
  });

  const freeze = useMutation({
    mutationFn: ({ id, frozen }: { id: string; frozen: boolean }) =>
      updateAccount(token, id, { frozen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] });
      toast.success("Account policy updated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Ledger accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Credit-ledger accounts. Balances move only by posting entries.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" />
          New account
        </Button>
      </div>

      {showCreate && (
        <CreateAccountForm token={token} onDone={() => setShowCreate(false)} />
      )}

      <Card>
        <CardHeader title={`${accounts.data?.length ?? 0} accounts`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Currency</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Overdraft</th>
                <th className="px-5 py-3">Payout address</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {accounts.data?.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onToggleFreeze={(frozen) =>
                    freeze.mutate({ id: account.id, frozen })
                  }
                />
              ))}
              {!accounts.isLoading && (accounts.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    No accounts found.
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

function AccountRow({
  account,
  onToggleFreeze,
}: {
  account: LedgerAccount;
  onToggleFreeze: (frozen: boolean) => void;
}) {
  return (
    <tr>
      <td className="px-5 py-3">
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {account.kind}
        </Badge>
      </td>
      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
        {account.ownerId ?? (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
        {account.currency}
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-gray-900 dark:text-gray-50">
        {account.balance.toLocaleString()}
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
        {account.overdraftLimit.toLocaleString()}
      </td>
      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-400">
        {account.externalPayoutAddress ?? (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={account.frozen ? "ABANDONED" : "ACTIVE"} />
      </td>
      <td className="px-5 py-3 text-right">
        <SecondaryButton
          type="button"
          onClick={() => onToggleFreeze(!account.frozen)}
          className="px-2.5 py-1 text-xs"
        >
          {account.frozen ? (
            <>
              <Unlock className="h-3.5 w-3.5" /> Unfreeze
            </>
          ) : (
            <>
              <Snowflake className="h-3.5 w-3.5" /> Freeze
            </>
          )}
        </SecondaryButton>
      </td>
    </tr>
  );
}

function CreateAccountForm({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    kind: LedgerAccountKind;
    ownerId: string;
    currency: string;
    overdraftLimit: string;
    externalPayoutAddress: string;
    label: string;
  }>({
    kind: "USER",
    ownerId: "",
    currency: "USD",
    overdraftLimit: "0",
    externalPayoutAddress: "",
    label: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createAccount(token, {
        kind: form.kind,
        ownerId: form.ownerId || undefined,
        currency: form.currency,
        overdraftLimit: form.overdraftLimit
          ? Number(form.overdraftLimit)
          : undefined,
        externalPayoutAddress: form.externalPayoutAddress || undefined,
        label: form.label || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] });
      toast.success("Account created");
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Card>
      <CardHeader title="Create a ledger account" />
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Kind">
          <select
            className={inputClass}
            value={form.kind}
            onChange={(e) => set({ kind: e.target.value as LedgerAccountKind })}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner ID (uuid) — omit for system accounts">
          <input
            className={inputClass}
            value={form.ownerId}
            onChange={(e) => set({ ownerId: e.target.value })}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </Field>
        <Field label="Currency">
          <input
            className={inputClass}
            value={form.currency}
            maxLength={3}
            onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Overdraft limit (minor units)">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.overdraftLimit}
            onChange={(e) => set({ overdraftLimit: e.target.value })}
          />
        </Field>
        <Field label="External payout address (makes it payable)">
          <input
            className={inputClass}
            value={form.externalPayoutAddress}
            onChange={(e) => set({ externalPayoutAddress: e.target.value })}
          />
        </Field>
        <Field label="Label">
          <input
            className={inputClass}
            value={form.label}
            onChange={(e) => set({ label: e.target.value })}
          />
        </Field>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
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
