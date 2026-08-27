"use client";

import { Card, CardHeader, StatusBadge } from "@/components/app-ui";
import { listMyPayments, type Payment } from "@/lib/payments-api";
import Cookies from "js-cookie";
import { useQuery } from "@tanstack/react-query";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount / 100);
}

export default function MyPaymentsPage() {
  const token = typeof window !== "undefined" ? Cookies.get("accessToken") : null;
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => listMyPayments(token!),
    enabled: !!token,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader title="My payments" description="Your recent payment activity." />
        <div className="px-5 py-4">
          {!token ? (
            <p className="text-sm text-amber-600">Sign in to view your payments.</p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">
              {(error as Error).message}
            </p>
          ) : data && data.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {(data ?? []).map((payment: Payment) => (
                <li key={payment.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {formatMoney(payment.amount, payment.currency)}{" "}
                      <span className="font-normal text-gray-500">{payment.rail}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {payment.id} · {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </main>
  );
}
