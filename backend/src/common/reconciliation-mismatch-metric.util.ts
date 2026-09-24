// Emits a metric for mismatches found per reconciliation.service.ts run,
// so a growing drift has an alerting signal via common/metrics.service.ts.
export interface MetricsGaugeSink {
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
}

const METRIC_NAME = 'reconciliation_mismatch_count';

export function recordReconciliationMismatchCount(
  sink: MetricsGaugeSink,
  mismatchCount: number,
  runId: string,
): void {
  sink.setGauge(METRIC_NAME, mismatchCount, { runId });
}
