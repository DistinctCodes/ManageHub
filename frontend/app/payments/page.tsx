"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getPayments,
  type GetPaymentsOptions,
  type PaymentStatus,
} from "@/lib/payments-api";
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

const STATUS_OPTIONS: PaymentStatus[] = [
  "INITIATED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "MANUAL_REVIEW",
  "DISPUTED",
  "VOIDED",
];

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
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["payments", "list", { status, from, to }],
    queryFn: ({ pageParam }) => {
      const options: GetPaymentsOptions = {};
      if (pageParam) options.cursor = pageParam;
      if (status) options.status = status;
      if (from) options.from = `${from}T00:00:00.000Z`;
      if (to) options.to = `${to}T23:59:59.999Z`;
      return Object.keys(options).length > 0
        ? getPayments(options)
        : getPayments();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(user),
  });

  const payments = data?.pages.flatMap((page) => page.data) ?? [];

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

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as PaymentStatus | "")
            }
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="from-date"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            From
          </label>
          <input
            id="from-date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="to-date"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            To
          </label>
          <input
            id="to-date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
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

      {!isLoading && !error && payments.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No payments yet.
            </p>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
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

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading more..." : "Load more"}
          </Button>
        </div>
      )}
    </main>
  );
}
