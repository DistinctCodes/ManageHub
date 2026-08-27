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
import Cookies from "js-cookie";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminChargePage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ChargeCreditsResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = Cookies.get("accessToken");
    if (!token) {
      toast.error("Sign in as an administrator.");
      return;
    }
    setBusy(true);
    try {
      const res = await chargeCredits(
        token,
        {
          userId,
          amount: Number(amount),
          currency: currency || undefined,
          reference,
          reason,
        },
      );
      setResult(res);
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
          <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
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

        {result ? (
          <div className="mt-6 rounded-md border border-gray-200 p-4 text-sm dark:border-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-50">
              {result.posted ? "Posted" : "Already applied (not posted)"} — new
              balance {result.balanceAfter} {result.currency}
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
