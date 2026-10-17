import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createTransport } from 'nodemailer';
import Handlebars from 'handlebars';
import { Repository } from 'typeorm';
import { WalletKeyAccessLog } from '../wallets/entities/wallet-key-access-log.entity';
import { MeteredUsageEvent } from '../credits/entities/metered-usage-event.entity';
import { MetricsService } from '../common/metrics.service';
import {
  outboundRequestHeaders,
  withRequestId,
} from '../common/request-context';
import {
  RetentionFailureAlert,
  runRetentionWithAlerting,
} from './retention-alerting.util';
import {
  buildRetentionDryRunResult,
  DryRunResult,
} from './retention-dry-run.util';

export interface RetentionSummary {
  walletKeyAccessLogDeleted: number;
  meteredUsageEventsDeleted: number;
  cutoff: Date;
  dryRun: boolean;
  walletKeyAccessLogSampleIds: string[];
  meteredUsageEventsSampleIds: string[];
}

export interface RetentionRunOptions {
  /** Preview only: count matching rows without deleting any. */
  dryRun?: boolean;
  /** Upper bound on rows deleted per statement, to keep locks short. */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1_000;
const DRY_RUN_SAMPLE_SIZE = 10;

/**
 * Scheduled data-retention job (issue BE-144, hardened in #1948).
 *
 * Both `wallet_key_access_log` (one row per key-access or wallet lifecycle
 * audit event) and `metered_usage_events` (one row per metered usage
 * charge) grow without bound and are only ever appended. This job deletes
 * rows older than a configurable window so neither table can grow forever.
 * The policy is documented in `src/retention/README.md`.
 *
 * Issue #1948 adds three safeguards on top of the original unbounded
 * `DELETE ... WHERE created_at < cutoff`:
 *
 * - deletion runs in bounded batches, so a large backlog cannot hold a
 *   long table lock;
 * - a failure increments a metric and raises an SMTP alert (the same
 *   best-effort path the reconciliation job uses) instead of only logging;
 * - `DATA_RETENTION_DRY_RUN=true` (or `RetentionRunOptions.dryRun`) reports
 *   the counts that would be removed without deleting anything, so an
 *   operator can preview a `DATA_RETENTION_MONTHS` change first.
 *
 * The outcome is always mirrored onto `/metrics` via `MetricsService`.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(WalletKeyAccessLog)
    private readonly accessLogRepository: Repository<WalletKeyAccessLog>,
    @InjectRepository(MeteredUsageEvent)
    private readonly usageRepository: Repository<MeteredUsageEvent>,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    if (this.config.get<string>('DATA_RETENTION_ENABLED', 'true') !== 'true') {
      return;
    }
    const dryRun =
      this.config.get<string>('DATA_RETENTION_DRY_RUN', 'false') === 'true';
    try {
      await runRetentionWithAlerting(
        async () => {
          const summary = await this.purgeExpiredData(new Date(), { dryRun });
          this.metrics.recordRetentionRun({
            dryRun: summary.dryRun,
            walletKeyAccessLogAffected: summary.walletKeyAccessLogDeleted,
            meteredUsageEventsAffected: summary.meteredUsageEventsDeleted,
            at: new Date(),
          });
          this.logger.log(
            withRequestId(`Retention pass: ${JSON.stringify(summary)}`),
          );
        },
        (alert) => this.onRetentionFailure(alert),
      );
    } catch {
      // onRetentionFailure already recorded the metric and fired the alert;
      // swallow so a scheduled failure never becomes an unhandled rejection.
    }
  }

  /**
   * The directly-testable core: deletes rows older than the retention
   * window in bounded batches. With `dryRun` set it changes nothing and
   * instead reports how many rows each table would lose.
   */
  async purgeExpiredData(
    now: Date = new Date(),
    options: RetentionRunOptions = {},
  ): Promise<RetentionSummary> {
    const retentionMonths = this.config.get<number>('DATA_RETENTION_MONTHS', 6);
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);

    const dryRun = options.dryRun ?? false;
    const batchSize = this.resolveBatchSize(options.batchSize);

    if (dryRun) {
      const accessPreview = await this.previewOlderThan(
        'access_log',
        'occurred_at',
        cutoff,
      );
      const usagePreview = await this.previewOlderThan(
        'usage_event',
        'created_at',
        cutoff,
      );
      return {
        walletKeyAccessLogDeleted: accessPreview.wouldAffect,
        meteredUsageEventsDeleted: usagePreview.wouldAffect,
        cutoff,
        dryRun: true,
        walletKeyAccessLogSampleIds: accessPreview.sampleIds,
        meteredUsageEventsSampleIds: usagePreview.sampleIds,
      };
    }

    const walletKeyAccessLogDeleted = await this.deleteOlderThanInBatches(
      this.accessLogRepository,
      'access_log',
      'occurred_at',
      cutoff,
      batchSize,
    );
    const meteredUsageEventsDeleted = await this.deleteOlderThanInBatches(
      this.usageRepository,
      'usage_event',
      'created_at',
      cutoff,
      batchSize,
    );

    return {
      walletKeyAccessLogDeleted,
      meteredUsageEventsDeleted,
      cutoff,
      dryRun: false,
      walletKeyAccessLogSampleIds: [],
      meteredUsageEventsSampleIds: [],
    };
  }

  private resolveBatchSize(configured?: number): number {
    const candidate = Number(
      configured ??
        this.config.get<number>(
          'DATA_RETENTION_BATCH_SIZE',
          DEFAULT_BATCH_SIZE,
        ),
    );
    return Number.isFinite(candidate) && candidate > 0
      ? Math.floor(candidate)
      : DEFAULT_BATCH_SIZE;
  }

  /**
   * Reads a bounded page of matching ids, deletes exactly those, and
   * repeats until a page comes back short (or empty). Every statement is
   * therefore bounded by `batchSize`, so an arbitrarily large backlog is
   * drained without one long-lived lock, and an interrupted run resumes
   * simply by running again — already-deleted rows no longer match.
   */
  private async deleteOlderThanInBatches(
    repository: Repository<WalletKeyAccessLog | MeteredUsageEvent>,
    alias: string,
    timestampColumn: string,
    cutoff: Date,
    batchSize: number,
  ): Promise<number> {
    let totalDeleted = 0;
    for (;;) {
      const rows = await repository
        .createQueryBuilder(alias)
        .select(`${alias}.id`, 'id')
        .where(`${alias}.${timestampColumn} < :cutoff`, { cutoff })
        .orderBy(`${alias}.id`, 'ASC')
        .limit(batchSize)
        .getRawMany<{ id: string }>();
      const ids = (rows ?? [])
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (ids.length === 0) {
        break;
      }
      const result = await repository.delete(ids);
      totalDeleted += result.affected ?? 0;
      if (ids.length < batchSize) {
        break;
      }
    }
    return totalDeleted;
  }

  private async previewOlderThan(
    alias: string,
    timestampColumn: string,
    cutoff: Date,
  ): Promise<DryRunResult> {
    const repository =
      alias === 'access_log' ? this.accessLogRepository : this.usageRepository;
    const total = await repository
      .createQueryBuilder(alias)
      .where(`${alias}.${timestampColumn} < :cutoff`, { cutoff })
      .getCount();
    const rows = await repository
      .createQueryBuilder(alias)
      .select(`${alias}.id`, 'id')
      .where(`${alias}.${timestampColumn} < :cutoff`, { cutoff })
      .orderBy(`${alias}.id`, 'ASC')
      .limit(DRY_RUN_SAMPLE_SIZE)
      .getRawMany<{ id: string }>();
    return buildRetentionDryRunResult(
      (rows ?? []).map((row) => row.id),
      DRY_RUN_SAMPLE_SIZE,
      total,
    );
  }

  private onRetentionFailure(alert: RetentionFailureAlert): void {
    this.metrics.recordRetentionFailure(alert.occurredAt);
    this.logger.error(withRequestId(`Retention pass failed: ${alert.message}`));
    void this.sendRetentionFailureAlert(alert).catch((error) => {
      this.logger.warn(
        withRequestId(
          `Unable to send retention failure alert email: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    });
  }

  /**
   * Sends the retention-failure alert over SMTP, reusing the same
   * best-effort nodemailer/Handlebars path as the reconciliation and
   * credit-spike alerts. Missing SMTP configuration makes this a no-op;
   * a delivery failure only warns and never masks the metric/log signal.
   */
  private async sendRetentionFailureAlert(
    alert: RetentionFailureAlert,
  ): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM_EMAIL');
    const supportEmail = this.config.get<string>('SUPPORT_EMAIL');
    if (!host || !user || !pass || !from || !supportEmail) {
      return;
    }

    const transport = createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: { user, pass },
    });
    const template = Handlebars.compile(
      '{{company}} data-retention job failed at {{occurredAt}}: {{message}}. Please investigate.',
    );
    await transport.sendMail({
      from,
      to: supportEmail,
      subject: `${this.config.get<string>('COMPANY_NAME', 'ManageHub')} data retention failure alert`,
      headers: outboundRequestHeaders(),
      text: template({
        company: this.config.get<string>('COMPANY_NAME', 'ManageHub'),
        occurredAt: alert.occurredAt.toISOString(),
        message: alert.message,
      }),
    });
  }
}
