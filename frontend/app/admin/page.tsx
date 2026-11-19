"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Coins,
  KeyRound,
  Landmark,
  RefreshCw,
  Scale,
  Split,
} from "lucide-react";
import { Card } from "@/components/admin/ui";
import {
  checkIntegrity,
  getReconciliationMetrics,
  listBatches,
  listReconciliationRuns,
} from "@/lib/admin-api";

const cards = [
  {
    href: "/admin/accounts",
    title: "Ledger accounts",
    description:
      "Browse and manage credit-ledger accounts — balances, policy, freezing, payout addresses.",
    icon: Landmark,
  },
  {
    href: "/admin/credits",
    title: "Credits & payments",
    description:
      "Manual credit adjustments, payment top-ups, and the global sweep operation.",
    icon: Coins,
  },
  {
    href: "/admin/integrity",
    title: "Integrity check",
    description:
      "Re-derive balances from the append-only entries and surface balance drift or unbalanced transactions.",
    icon: Scale,
  },
  {
    href: "/admin/splits",
    title: "Revenue splits",
    description:
      "Create and manage revenue-split configs, inspect recipients, and preview allocations.",
    icon: Split,
  },
  {
    href: "/admin/settlements",
    title: "Settlement pipeline",
    description:
      "Inspect settlement batches, view breakdowns, and drive execute / retry / abandon recovery.",
    icon: RefreshCw,
  },
  {
    href: "/admin/payments",
    title: "Payments",
    description:
      "Find any payment by id, user, booking, or status and work the manual-review queue.",
    icon: ClipboardList,
  },
  {
    href: "/admin/key-rotation",
    title: "Custodial key rotation",
    description:
      "Inspect the active KMS key and rotate wrapped wallet data keys with a typed confirmation.",
    icon: KeyRound,
  },
];

export default function AdminDashboardPage() {
  const metrics = useQuery({
    queryKey: ["admin-dashboard-metrics"],
    queryFn: () => getReconciliationMetrics(),
    refetchInterval: 30_000,
  });
  const batches = useQuery({
    queryKey: ["admin-dashboard-batches"],
    queryFn: () => listBatches(),
  });
  const runs = useQuery({
    queryKey: ["admin-dashboard-runs"],
    queryFn: () => listReconciliationRuns(1),
  });
  const integrity = useQuery({
    queryKey: ["admin-dashboard-integrity"],
    queryFn: () => checkIntegrity(),
  });

  const openBatches = (batches.data ?? []).filter(
    (batch) => batch.status === "PENDING" || batch.status === "IN_PROGRESS",
  );
  const latestRun = runs.data?.[0];
  const report = integrity.data;
  const healthy = report
    ? report.balanceDrift.length === 0 && report.unbalancedTransactions.length === 0
    : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
        Admin dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Live operational signals for the credit ledger, payment reconciliation,
        and the settlement pipeline.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          href="/admin/payments"
          title="Manual-review depth"
          icon={ClipboardList}
          value={
            metrics.error
              ? "—"
              : metrics.isLoading
                ? "…"
                : String(metrics.data?.manualReviewQueueDepth ?? 0)
          }
          detail={
            metrics.error
              ? (metrics.error as Error).message
              : metrics.data
                ? `Alert threshold ${metrics.data.alertThreshold} · alerting ${
                    metrics.data.alerting ? "ON" : "off"
                  }`
                : "Payments awaiting manual review."
          }
          warning={metrics.data?.alerting}
        />
        <SummaryTile
          href="/admin/settlements"
          title="Open settlement batches"
          icon={RefreshCw}
          value={
            batches.error
              ? "—"
              : batches.isLoading
                ? "…"
                : String(openBatches.length)
          }
          detail={
            batches.error
              ? (batches.error as Error).message
              : `${batches.data?.length ?? 0} batches in total · pending or in progress`
          }
        />
        <SummaryTile
          href="/admin/payments"
          title="Latest reconciliation run"
          icon={Activity}
          value={
            runs.error
              ? "—"
              : runs.isLoading
                ? "…"
                : latestRun
                  ? (latestRun.outcome ?? "RUNNING")
                  : "None"
          }
          detail={
            runs.error
              ? (runs.error as Error).message
              : latestRun
                ? `${new Date(latestRun.startedAt).toLocaleString()} · ${latestRun.escalatedToManualReview} escalated · ${latestRun.candidates} candidates`
                : "No reconciliation runs recorded yet."
          }
        />
        <SummaryTile
          href="/admin/integrity"
          title="Ledger integrity"
          icon={healthy === false ? AlertTriangle : Scale}
          value={
            integrity.error
              ? "—"
              : integrity.isLoading
                ? "…"
                : healthy === null
                  ? "—"
                  : healthy
                    ? "Healthy"
                    : "Issues"
          }
          detail={
            integrity.error
              ? (integrity.error as Error).message
              : report
                ? `${report.accountsChecked} accounts checked · ${report.balanceDrift.length} drift · ${report.unbalancedTransactions.length} unbalanced`
                : "Re-derived from append-only ledger entries."
          }
          warning={healthy === false}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-gray-900 dark:text-gray-50">
        Admin tools
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-5 transition hover:border-blue-400 hover:shadow-md dark:hover:border-blue-600">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-50">
                  {title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({
  href,
  title,
  value,
  detail,
  icon: Icon,
  warning,
}: {
  href: string;
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  warning?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-5 transition hover:border-blue-400 hover:shadow-md dark:hover:border-blue-600">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p
              className={`mt-2 text-3xl font-semibold ${
                warning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-900 dark:text-gray-50"
              }`}
            >
              {value}
            </p>
          </div>
          <Icon className="h-5 w-5 shrink-0 text-blue-600" />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
      </Card>
    </Link>
  );
}
