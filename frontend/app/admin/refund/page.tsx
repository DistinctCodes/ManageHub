"use client";

import {
  Button,
  Card,
  CardHeader,
  Field,
  inputClass,
  StatusBadge,
} from "@/components/app-ui";
import { RequireAdmin } from "@/components/admin/require-admin";
import {
  listManualReviewPayments,
  requestRefund,
  type Payment,
} from "@/lib/payments-api";
import Cookies from "js-cookie";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

function PaymentRow({ payment }: { payment: Payment }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(payment.amount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const token = typeof window !== "undefined" ? Cookies.get("accessToken") : null;

  async function onRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      await requestRefund(token, payment.id, Number(amount), reason);
      toast.success("Refund request submitted");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["manual-review"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
            {payment.id}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {payment.currency} {payment.amount} ·{" "}
            {new Date(payment.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={payment.status} />
      </div>
      {payment.manualReviewReason ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Review reason: {payment.manualReviewReason}
        </p>
      ) : null}
      <form onSubmit={onRefund} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Refund amount">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Reason">
          <input
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? "Refunding…" : "Refund"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminRefundPage() {
  const token = typeof window !== "undefined" ? Cookies.get("accessToken") : null;
  const { data, isLoading, error } = useQuery({
    queryKey: ["manual-review"],
    queryFn: () => listManualReviewPayments(token!),
    enabled: !!token,
  });

  return (
    <RequireAdmin>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader
            title="Refund payments"
            description="Payments awaiting reconciliation or manual review can be refunded."
          />
          <div className="space-y-4 px-5 py-4">
            {!token ? (
              <p className="text-sm text-amber-600">Sign in required.</p>
            ) : isLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{(error as Error).message}</p>
            ) : data && data.length === 0 ? (
              <p className="text-sm text-gray-500">
                No payments found in manual review.
              </p>
            ) : (
              (data ?? []).map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))
            )}
          </div>
        </Card>
      </main>
    </RequireAdmin>
  );
}
