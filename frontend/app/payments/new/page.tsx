"use client";

import { Button, Card, CardHeader, Field, inputClass } from "@/components/app-ui";
import { initiatePayment, type PaymentRail } from "@/lib/payments-api";
import Cookies from "js-cookie";
import { useState } from "react";
import { toast } from "sonner";

export default function NewPaymentPage() {
  const [token] = useState(() => Cookies.get("accessToken"));
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [rail, setRail] = useState<PaymentRail>("FIAT");
  const [provider, setProvider] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("You must sign in to make a payment.");
      return;
    }
    setSubmitting(true);
    try {
      const payment = await initiatePayment(
        token,
        {
          bookingId,
          amount: Number(amount),
          currency,
          rail,
          provider: provider || undefined,
        },
        crypto.randomUUID(),
      );
      setPaymentId(payment.id);
      toast.success("Payment initiated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader
          title="Initiate payment"
          description="Create a new payment for a booking."
        />
        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          <Field label="Booking ID">
            <input
              className={inputClass}
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="booking uuid"
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
              placeholder="e.g. 5000"
              required
            />
          </Field>
          <Field label="Currency (ISO 4217)">
            <input
              className={inputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              required
            />
          </Field>
          <Field label="Rail">
            <select
              className={inputClass}
              value={rail}
              onChange={(e) => setRail(e.target.value as PaymentRail)}
            >
              <option value="FIAT">FIAT</option>
              <option value="STELLAR_CUSTODIAL">STELLAR_CUSTODIAL</option>
              <option value="STELLAR_EXTERNAL">STELLAR_EXTERNAL</option>
            </select>
          </Field>
          <Field label="Provider (optional)">
            <input
              className={inputClass}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. paystack"
            />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Initiating…" : "Initiate payment"}
          </Button>
        </form>
      </Card>

      {paymentId ? (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Payment created: <code className="font-mono">{paymentId}</code>. Use
          the Idempotency-Key for retries; continue the flow from the payments
          API to confirm or pay.
        </div>
      ) : null}
    </main>
  );
}
