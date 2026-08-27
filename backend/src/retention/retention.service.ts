import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { WalletKeyAccessLog } from '../wallets/entities/wallet-key-access-log.entity';
import { MeteredUsageEvent } from '../credits/entities/metered-usage-event.entity';

export interface RetentionSummary {
  walletKeyAccessLogDeleted: number;
  meteredUsageEventsDeleted: number;
  cutoff: Date;
}

/**
 * Scheduled data-retention job (issue BE-144).
 *
 * Both `wallet_key_access_log` (one row per key-decrypt operation) and
 * `metered_usage_events` (one row per metered usage charge) grow without
 * bound and are only ever appended. This job deletes rows older than a
 * configurable window so neither table can grow forever. The policy is
 * documented in `src/retention/README.md`.
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
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    if (this.config.get<string>('DATA_RETENTION_ENABLED', 'true') !== 'true') {
      return;
    }
    try {
      const summary = await this.purgeExpiredData();
      this.logger.log(`Retention pass: ${JSON.stringify(summary)}`);
    } catch (error) {
      this.logger.error(
        `Retention pass failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** The directly-testable core: deletes rows older than the retention window. */
  async purgeExpiredData(now: Date = new Date()): Promise<RetentionSummary> {
    const retentionMonths = this.config.get<number>('DATA_RETENTION_MONTHS', 6);
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);

    const accessLogResult = await this.accessLogRepository.delete({
      occurredAt: LessThan(cutoff),
    });
    const usageResult = await this.usageRepository.delete({
      createdAt: LessThan(cutoff),
    });

    return {
      walletKeyAccessLogDeleted: accessLogResult.affected ?? 0,
      meteredUsageEventsDeleted: usageResult.affected ?? 0,
      cutoff,
    };
  }
}
