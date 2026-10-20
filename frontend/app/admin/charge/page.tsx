"use client";

import {
  Button,
  Card,
  CardHeader,
  Field,
  inputClass,
} from "@/components/app-ui";
import { RequireAdmin } from "@/components/admin/require-admin";
import { chargeCredits, type ChargeCreditsResponse } from "@/lib/payments-api";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminChargePage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ChargeCreditsResponse | null>(null);

  async function confirmCharge() {
    setBusy(true);
    try {
      const res = await chargeCredits(
        {
          userId,
          amount: Number(amount),
          currency: currency || undefined,
          reference,
          reason,
        },
      );
      setResult(res);
      setConfirming(false);
      toast.success(res.posted ? "Charge posted" : "Charge already applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Charge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAdmin>
      <main className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardHeader
            title="Charge credits"
            description="Charge a member's credit balance (internal, service-to-service)."
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirming(true);
            }}
            className="space-y-4 px-5 py-5"
          >
            <Field label="User ID">
              <input
                className={inputClass}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="member uuid"
                required
              />
            </Field>
            <Field label="Amount (minor units)">
              <input
                className={inputClass}
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field label="Currency (optional)">
              <input
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="defaults to CREDITS_DEFAULT_CURRENCY"
              />
            </Field>
            <Field label="Reference (idempotency key)">
              <input
                className={inputClass}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. print-job-8f21"
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
            <Button type="submit" disabled={busy}>
              {busy ? "Charging…" : "Charge credits"}
            </Button>
          </form>
        </Card>

        {confirming ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-charge-title"
            className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
          >
            <h2 id="confirm-charge-title" className="font-semibold">
              Confirm charge
            </h2>
            <p className="mt-1">
              Charge {amount || "0"} minor units to {userId || "this member"}?
            </p>
            <div className="mt-4 flex gap-3">
              <Button type="button" onClick={confirmCharge} disabled={busy}>
                {busy ? "Charging..." : "Confirm charge"}
              </Button>
              <Button
                type="button"
                className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 rounded-md border border-gray-200 p-4 text-sm dark:border-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-50">
              {result.posted ? "Posted" : "Already applied (not posted)"} — new
              balance {formatCurrency(fromMinorUnits(result.balanceAfter, result.currency), result.currency)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Transaction {result.transaction.id} ({result.transaction.kind})
            </p>
          </div>
        ) : null}
      </main>
    </RequireAdmin>
  );
}
