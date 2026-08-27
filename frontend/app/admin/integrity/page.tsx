"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { checkIntegrity } from "@/lib/admin-api";
import { Card, CardHeader, Button } from "@/components/admin/ui";
import { RequireAdmin, useAdminToken } from "@/components/admin/require-admin";

export default function IntegrityPage() {
  const token = useAdminToken();

  return (
    <RequireAdmin>
      <IntegrityInner token={token as string} />
    </RequireAdmin>
  );
}

function IntegrityInner({ token }: { token: string }) {
  const report = useQuery({
    queryKey: ["ledger-integrity"],
    queryFn: () => checkIntegrity(token),
    refetchOnWindowFocus: false,
  });

  const reason = (r: { materialized: number; derived: number }) =>
    r.materialized - r.derived;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Ledger integrity check
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every account balance is re-derived from the append-only entries;
            both lists empty is the healthy state.
          </p>
        </div>
        <Button type="button" onClick={() => report.refetch()} disabled={report.isFetching}>
          {report.isFetching ? "Checking…" : "Run check"}
        </Button>
      </div>

      {report.isLoading ? (
        <Card className="p-6 text-sm text-gray-500 dark:text-gray-400">
          Checking ledger integrity…
        </Card>
      ) : report.error ? (
        <Card className="p-6 text-sm text-red-600 dark:text-red-400">
          {report.error.message}
        </Card>
      ) : (
        <>
          <Summary report={report.data!} />
          <DriftTable rows={report.data!.balanceDrift} reason={reason} />
          <UnbalancedTable rows={report.data!.unbalancedTransactions} />
        </>
      )}
    </div>
  );
}

function Summary({
  report,
}: {
  report: { accountsChecked: number; balanceDrift: unknown[]; unbalancedTransactions: unknown[] };
}) {
  const healthy = report.balanceDrift.length === 0 && report.unbalancedTransactions.length === 0;
  return (
    <Card className="flex items-center gap-4 p-5">
      {healthy ? (
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      ) : (
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      )}
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-50">
          {healthy ? "Ledger is consistent" : "Ledger drift detected"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {report.accountsChecked} accounts checked · {report.balanceDrift.length} with balance drift ·
          {" "}{report.unbalancedTransactions.length} unbalanced transactions
        </p>
      </div>
    </Card>
  );
}

function DriftTable({
  rows,
  reason,
}: {
  rows: Array<{ accountId: string; materialized: number; derived: number }>;
  reason: (r: { materialized: number; derived: number }) => number;
}) {
  return (
    <Card>
      <CardHeader
        title="Account balance drift"
        description="Materialized vs derived balance — any row here is a bug to investigate."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3 text-right">Materialized</th>
              <th className="px-5 py-3 text-right">Derived</th>
              <th className="px-5 py-3 text-right">Drift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.accountId}>
                <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {row.accountId}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{row.materialized}</td>
                <td className="px-5 py-3 text-right tabular-nums">{row.derived}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium text-red-600 dark:text-red-400">
                  {reason(row)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  No drift — every account reconciles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UnbalancedTable({
  rows,
}: {
  rows: Array<{ transactionId: string; debits: number; credits: number }>;
}) {
  return (
    <Card>
      <CardHeader
        title="Unbalanced transactions"
        description="Transactions whose debits and credits do not cancel."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3">Transaction</th>
              <th className="px-5 py-3 text-right">Debits</th>
              <th className="px-5 py-3 text-right">Credits</th>
              <th className="px-5 py-3 text-right">Imbalance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.transactionId}>
                <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {row.transactionId}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{row.debits}</td>
                <td className="px-5 py-3 text-right tabular-nums">{row.credits}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium text-red-600 dark:text-red-400">
                  {row.debits - row.credits}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  No unbalanced transactions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
