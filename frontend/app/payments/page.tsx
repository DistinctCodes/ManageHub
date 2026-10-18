"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPayments } from "@/lib/payments-api";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";
import { formatCurrency, fromMinorUnits } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Payment amounts arrive as integer minor units.
function formatAmount(amount: number, currency: string): string {
  return formatCurrency(fromMinorUnits(amount, currency), currency);
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
  useSessionBootstrap();
  const user = useSessionStore((state) => state.user);
  const sessionStatus = useSessionStore((state) => state.status);
  const {
    data: payments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payments", "list"],
    queryFn: () => getPayments(),
    enabled: Boolean(user),
  });

  if (sessionStatus === "unknown") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Payments</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!user) {
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <UserMenu />
      </div>

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
