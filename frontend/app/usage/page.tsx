"use client";

import { Card, CardHeader, StatusBadge } from "@/components/app-ui";
import { listMyUsage, type MeteredUsageEvent } from "@/lib/payments-api";
import { formatCurrency } from "@/lib/utils";
import { useSessionBootstrap } from "@/lib/stores/use-session-bootstrap";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserMenu } from "@/components/auth/user-menu";
import { useQuery } from "@tanstack/react-query";

function formatMoney(amount: number, currency: string) {
  return formatCurrency(amount / 100, currency || "USD");
}

export default function UsagePage() {
  useSessionBootstrap();
  const user = useSessionStore((state) => state.user);
  const sessionStatus = useSessionStore((state) => state.status);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-usage"],
    queryFn: () => listMyUsage(),
    enabled: Boolean(user),
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center justify-end">
        <UserMenu />
      </div>
      <Card>
        <CardHeader title="Usage history" description="Your metered usage, newest first." />
        <div className="px-5 py-4">
          {sessionStatus === "unknown" ? (
            <p className="text-sm text-gray-500">Checking your session...</p>
          ) : !user ? (
            <p className="text-sm text-amber-600">Sign in to view usage.</p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{(error as Error).message}</p>
          ) : data && data.length === 0 ? (
            <p className="text-sm text-gray-500">No usage recorded.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {(data ?? []).map((event: MeteredUsageEvent) => (
                <li key={event.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {event.resource} · {event.units} units @{" "}
                      {formatMoney(event.unitPrice, event.currency)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.usageReference} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatMoney(event.amount, event.currency)}
                    </span>
                    <StatusBadge
                      status={event.charged ? "CONFIRMED" : "PENDING"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </main>
  );
}
