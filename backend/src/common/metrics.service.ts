import { Injectable } from '@nestjs/common';

interface MetricSample {
  labels: Record<string, string>;
  value: number;
}

interface HistogramSample {
  labels: Record<string, string>;
  count: number;
  sum: number;
  // Cumulative bucket counts, one per HISTOGRAM_BUCKETS_SECONDS entry plus a
  // trailing +Inf bucket — Prometheus's `le` (less-than-or-equal) convention.
  buckets: number[];
}

// Bucket upper bounds, in seconds, for the per-endpoint latency histogram
// (issue #1780). Covers fast in-process handlers (5ms) up to slow
// downstream-dependent ones (10s); a request slower than that only counts
// against the +Inf bucket.
const HISTOGRAM_BUCKETS_SECONDS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, MetricSample[]>();
  private readonly gauges = new Map<string, MetricSample[]>();
  private readonly summaries = new Map<
    string,
    { count: number; sum: number; labels: Record<string, string> }
  >();
  private readonly histograms = new Map<string, HistogramSample[]>();

  recordPaymentTransition(from: string, to: string): void {
    this.incrementCounter('managehub_payment_status_transitions_total', {
      from,
      to,
    });
  }

  recordReconciliationPass(durationMs: number): void {
    this.observeSummary('managehub_reconciliation_pass_duration_seconds', {
      value: durationMs / 1000,
      labels: {},
    });
  }

  setManualReviewDepth(depth: number): void {
    this.setGauge('managehub_manual_review_queue_depth', {}, depth);
  }

  recordSettlementPayoutAttempt(result: 'submitted' | 'confirmed' | 'failed'): void {
    this.incrementCounter('managehub_settlement_payout_attempts_total', {
      result,
    });
  }

  recordSettlementPayoutFailure(): void {
    this.incrementCounter('managehub_settlement_payout_failures_total', {});
  }

  /**
   * Records one HTTP request's duration for the per-route/method latency
   * histogram (issue #1780) — lets p95/p99 regressions on a specific
   * endpoint be caught, which a plain request counter can't show.
   */
  recordHttpRequestDuration(
    route: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.observeHistogram(
      'managehub_http_request_duration_seconds',
      { route, method, status_code: String(statusCode) },
      durationMs / 1000,
    );
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    this.appendCounters(lines);
    this.appendGauges(lines);
    this.appendSummaries(lines);
    this.appendHistograms(lines);
    return `${lines.join('\n')}\n`;
  }

  private incrementCounter(
    name: string,
    labels: Record<string, string>,
    delta = 1,
  ): void {
    const series = this.counters.get(name) ?? [];
    const existing = series.find((item) => this.sameLabels(item.labels, labels));
    if (existing) {
      existing.value += delta;
    } else {
      series.push({ labels, value: delta });
      this.counters.set(name, series);
    }
  }

  private setGauge(
    name: string,
    labels: Record<string, string>,
    value: number,
  ): void {
    const series = this.gauges.get(name) ?? [];
    const existing = series.find((item) => this.sameLabels(item.labels, labels));
    if (existing) {
      existing.value = value;
    } else {
      series.push({ labels, value });
      this.gauges.set(name, series);
    }
  }

  private observeSummary(
    name: string,
    sample: { value: number; labels: Record<string, string> },
  ): void {
    const existing = this.summaries.get(name);
    if (existing && this.sameLabels(existing.labels, sample.labels)) {
      existing.count += 1;
      existing.sum += sample.value;
      return;
    }
    this.summaries.set(name, {
      count: 1,
      sum: sample.value,
      labels: sample.labels,
    });
  }

  private observeHistogram(
    name: string,
    labels: Record<string, string>,
    valueSeconds: number,
  ): void {
    const series = this.histograms.get(name) ?? [];
    let sample = series.find((item) => this.sameLabels(item.labels, labels));
    if (!sample) {
      sample = {
        labels,
        count: 0,
        sum: 0,
        buckets: new Array(HISTOGRAM_BUCKETS_SECONDS.length + 1).fill(0),
      };
      series.push(sample);
      this.histograms.set(name, series);
    }
    sample.count += 1;
    sample.sum += valueSeconds;
    HISTOGRAM_BUCKETS_SECONDS.forEach((bound, index) => {
      if (valueSeconds <= bound) {
        sample!.buckets[index] += 1;
      }
    });
    // +Inf bucket always includes every observation.
    sample.buckets[HISTOGRAM_BUCKETS_SECONDS.length] += 1;
  }

  private appendCounters(lines: string[]): void {
    for (const [name, series] of this.counters.entries()) {
      lines.push(`# TYPE ${name} counter`);
      for (const sample of series) {
        lines.push(`${name}${this.formatLabels(sample.labels)} ${sample.value}`);
      }
    }
  }

  private appendGauges(lines: string[]): void {
    for (const [name, series] of this.gauges.entries()) {
      lines.push(`# TYPE ${name} gauge`);
      for (const sample of series) {
        lines.push(`${name}${this.formatLabels(sample.labels)} ${sample.value}`);
      }
    }
  }

  private appendSummaries(lines: string[]): void {
    for (const [name, summary] of this.summaries.entries()) {
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count${this.formatLabels(summary.labels)} ${summary.count}`);
      lines.push(`${name}_sum${this.formatLabels(summary.labels)} ${summary.sum}`);
    }
  }

  private appendHistograms(lines: string[]): void {
    for (const [name, series] of this.histograms.entries()) {
      lines.push(`# TYPE ${name} histogram`);
      for (const sample of series) {
        HISTOGRAM_BUCKETS_SECONDS.forEach((bound, index) => {
          lines.push(
            `${name}_bucket${this.formatLabels({ ...sample.labels, le: String(bound) })} ${sample.buckets[index]}`,
          );
        });
        lines.push(
          `${name}_bucket${this.formatLabels({ ...sample.labels, le: '+Inf' })} ${sample.buckets[HISTOGRAM_BUCKETS_SECONDS.length]}`,
        );
        lines.push(
          `${name}_sum${this.formatLabels(sample.labels)} ${sample.sum}`,
        );
        lines.push(
          `${name}_count${this.formatLabels(sample.labels)} ${sample.count}`,
        );
      }
    }
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) {
      return '';
    }
    return `{${entries
      .map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`)
      .join(',')}}`;
  }

  private sameLabels(
    a: Record<string, string>,
    b: Record<string, string>,
  ): boolean {
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);
    if (aEntries.length !== bEntries.length) {
      return false;
    }
    return aEntries.every(([key, value]) => b[key] === value);
  }
}
