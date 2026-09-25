import { CheckCircle2 } from "lucide-react";
import type { LedgerIntegrityReport } from "@/lib/admin-api";
import { Card, CardHeader } from "@/components/admin/ui";

export function IntegrityResults({ report }: { report: LedgerIntegrityReport }) {
  const hasDiscrepancies =
    report.balanceDrift.length > 0 || report.unbalancedTransactions.length > 0;

  if (!hasDiscrepancies) {
    return <IntegrityEmptyState accountsChecked={report.accountsChecked} />;
  }

  const reason = (row: { materialized: number; derived: number }) =>
    row.materialized - row.derived;

  return (
    <>
      <DriftTable rows={report.balanceDrift} reason={reason} />
      <UnbalancedTable rows={report.unbalancedTransactions} />
    </>
  );
}

export function IntegrityEmptyState({ accountsChecked }: { accountsChecked: number }) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="flex items-center gap-4 border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-50">
          No discrepancies found
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All {accountsChecked} checked accounts reconcile, and every transaction
          balances.
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
  reason: (row: { materialized: number; derived: number }) => number;
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
