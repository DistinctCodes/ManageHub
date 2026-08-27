"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPayments } from "@/lib/payments-api";
import { useSessionStore } from "@/lib/stores/session-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatAmount(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function statusTone(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "text-green-600 dark:text-green-400";
    case "FAILED":
    case "DISPUTED":
      return "text-red-600 dark:text-red-400";
    case "MANUAL_REVIEW":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export default function PaymentsPage() {
  const accessToken = useSessionStore((state) => state.accessToken);

  const {
    data: payments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payments", "list"],
    queryFn: () => getPayments(accessToken as string),
    enabled: Boolean(accessToken),
  });

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Payments</h1>
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to see your payment history.
            </p>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Payments</h1>

      {isLoading && (
        <Card>
          <CardContent>Loading your payments...</CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </CardContent>
        </Card>
      )}

      {payments && payments.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No payments yet.
            </p>
          </CardContent>
        </Card>
      )}

      {payments && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Link key={payment.id} href={`/payments/${payment.id}`}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {formatAmount(payment.amount, payment.currency)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {payment.rail} &middot; {new Date(payment.createdAt).toLocaleString()}
                  </span>
                  <span className={`font-medium ${statusTone(payment.status)}`}>
                    {payment.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
