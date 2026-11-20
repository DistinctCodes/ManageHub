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
import { getPayment, requestRefund, type Payment } from "@/lib/payments-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";

function refundedMinorUnits(payment: Payment): number {
  if (
    typeof payment.refundedAmount === "number" &&
    Number.isFinite(payment.refundedAmount)
  ) {
    return Math.max(0, payment.refundedAmount);
  }
  if (Array.isArray(payment.refunds)) {
    return payment.refunds.reduce((total, refund) => total + refund.amount, 0);
  }
  return 0;
}

function PaymentRow({ payment }: { payment: Payment }) {
  const queryClient = useQueryClient();
  const refundedSoFar = refundedMinorUnits(payment);
  const remaining =
    typeof payment.remainingAmount === "number" &&
    Number.isFinite(payment.remainingAmount)
      ? Math.max(0, payment.remainingAmount)
      : Math.max(0, payment.amount - refundedSoFar);
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAmount(String(remaining));
  }, [remaining]);

  async function onRefund(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > remaining) {
      toast.error(
        remaining > 0
          ? `Refund amount must be between 1 and ${remaining} minor units.`
          : "This payment has no remaining refundable amount.",
      );
      return;
    }
    setBusy(true);
    try {
      await requestRefund(payment.id, parsed, reason);
      toast.success("Refund request submitted");
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: ["admin-refund-payment"],
      });
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
            {formatCurrency(
              fromMinorUnits(
                payment.amount,
                payment.currency,
                payment.currencyExponent,
              ),
              payment.currency,
              undefined,
              payment.currencyExponent,
            )}{" "}
            ·{" "}
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
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Refunded so far:{" "}
          {formatCurrency(
            fromMinorUnits(refundedSoFar, payment.currency),
            payment.currency,
          )}
        </span>
        <span>
          Remaining:{" "}
          {formatCurrency(
            fromMinorUnits(remaining, payment.currency),
            payment.currency,
          )}
        </span>
      </div>
      <form onSubmit={onRefund} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Refund amount">
          <input
            className={inputClass}
            type="number"
            min={remaining > 0 ? 1 : 0}
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy || remaining <= 0}
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
          <Button type="submit" disabled={busy || remaining <= 0}>
            {busy ? "Refunding…" : "Refund"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminRefundPage() {
  const [searchId, setSearchId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-refund-payment", paymentId],
    queryFn: () => getPayment(paymentId),
    enabled: Boolean(paymentId),
    retry: false,
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = searchId.trim();
    if (!id) return;
    if (id === paymentId) {
      void refetch();
      return;
    }
    setPaymentId(id);
  }

  return (
    <RequireAdmin>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader
            title="Refund payments"
            description="Look up any payment by ID to see its refunded and remaining balance."
          />
          <div className="space-y-4 px-5 py-4">
            <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Field label="Payment ID">
                  <input
                    className={inputClass}
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="Enter a payment ID"
                    required
                  />
                </Field>
              </div>
              <div className="flex items-end">
                <Button type="submit">Search</Button>
              </div>
            </form>

            {!paymentId ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search for a payment by ID to view its refundable balance.
              </p>
            ) : isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading payment…
              </p>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {(error as Error).message}
              </p>
            ) : payment ? (
              <PaymentRow key={payment.id} payment={payment} />
            ) : null}
          </div>
        </Card>
      </main>
    </RequireAdmin>
  );
}
