"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { checkIntegrity, type LedgerIntegrityReport } from "@/lib/admin-api";
import { Card, CardHeader, Button } from "@/components/admin/ui";
import { IntegrityResults } from "@/components/admin/integrity-results";
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
      ) : report.data ? (
        <>
          <Summary report={report.data} />
          <IntegrityResults report={report.data} />
        </>
      ) : null}
    </div>
  );
}

function Summary({
  report,
}: {
  report: LedgerIntegrityReport;
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

