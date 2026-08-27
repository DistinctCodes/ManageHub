import { Injectable } from '@nestjs/common';

interface MetricSample {
  labels: Record<string, string>;
  value: number;
}

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, MetricSample[]>();
  private readonly gauges = new Map<string, MetricSample[]>();
  private readonly summaries = new Map<
    string,
    { count: number; sum: number; labels: Record<string, string> }
  >();

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

  renderPrometheus(): string {
    const lines: string[] = [];
    this.appendCounters(lines);
    this.appendGauges(lines);
    this.appendSummaries(lines);
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
