import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { MeteredUsageEvent } from './entities/metered-usage-event.entity';
import { MeteredResource } from './enums/metered-resource.enum';
import { CreditsService } from './credits.service';
import { MetricsService } from '../common/metrics.service';
import { withRequestId } from '../common/request-context';
import { createTransport } from 'nodemailer';
import Handlebars from 'handlebars';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface RecordUsageInput {
  userId: string;
  resource: MeteredResource;
  /** Minutes, pages, ... — whatever this resource meters. */
  units: number;
  /** Minor units per unit. */
  unitPrice: number;
  currency?: string;
  /** The caller's natural key for this usage event — the dedupe key. */
  usageReference: string;
  actorId?: string | null;
}

export interface RecordUsageResult {
  event: MeteredUsageEvent;
  /** False when this usage event had already been recorded and charged. */
  charged: boolean;
}

/**
 * The metered call site for the credit ledger's spend path (issue #1575):
 * per-minute resource usage, printing and meeting-room overage priced in
 * minor units and charged straight against a member's credit balance.
 *
 * This is the shape a resource-usage feature is expected to have — it owns
 * the pricing and the usage audit record, and it hands the ledger nothing
 * but an amount and a dedupe key. No payment rail and no chain call is
 * involved: settling a two-cent print job individually would cost more in
 * fees and latency than the job itself, which is the whole reason this
 * module exists.
 *
 * A charge and its usage record are made idempotent by two independent
 * unique keys pointing at the same natural reference — the ledger
 * transaction's `charge:usage:<ref>` and this table's `usageReference` —
 * so a retried delivery of the same meter reading charges exactly once
 * even if it fails between the two writes.
 */
@Injectable()
export class MeteredUsageService {
  private readonly logger = new Logger(MeteredUsageService.name);

  constructor(
    @InjectRepository(MeteredUsageEvent)
    private readonly usageRepository: Repository<MeteredUsageEvent>,
    private readonly credits: CreditsService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async recordUsage(input: RecordUsageInput): Promise<RecordUsageResult> {
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new BadRequestException('Usage units must be a positive integer');
    }
    if (!Number.isInteger(input.unitPrice) || input.unitPrice <= 0) {
      throw new BadRequestException(
        'Unit price must be a positive integer (minor units)',
      );
    }
    if (!input.usageReference?.trim()) {
      throw new BadRequestException('A usage reference is required');
    }

    const usageReference = input.usageReference.trim();
    const existing = await this.usageRepository.findOne({
      where: { usageReference },
    });
    if (existing) {
      return { event: existing, charged: false };
    }

    const amount = input.units * input.unitPrice;
    const currency = input.currency ?? this.credits.defaultCurrency();

    // Charge first: the ledger is the thing that must not be wrong. If
    // recording the event below fails, a retry re-charges against the same
    // reference and the ledger returns the original transaction instead of
    // posting a second one.
    const charge = await this.credits.charge({
      userId: input.userId,
      amount,
      currency,
      reference: `usage:${usageReference}`,
      reason: `${input.resource} x${input.units} @ ${input.unitPrice}`,
      metadata: {
        resource: input.resource,
        units: input.units,
        unitPrice: input.unitPrice,
        usageReference,
      },
      actorId: input.actorId ?? null,
    });

    let event: MeteredUsageEvent;
    try {
      event = await this.usageRepository.save(
        this.usageRepository.create({
          userId: input.userId,
          resource: input.resource,
          units: input.units,
          unitPrice: input.unitPrice,
          amount,
          currency: charge.currency,
          usageReference,
          ledgerTransactionId: charge.transaction.id,
        }),
      );
    } catch (error) {
      // Two deliveries of the same meter reading raced. The ledger already
      // deduped the charge, so the loser just reports the winner's event.
      if (this.isUniqueViolation(error)) {
        const winner = await this.usageRepository.findOne({
          where: { usageReference },
        });
        if (winner) {
          return { event: winner, charged: false };
        }
      }
      throw error;
    }

    // Detection is deliberately after both durable writes. A detector,
    // metrics, or email failure is observational only and must never undo
    // the charge or make the caller retry a successfully recorded event.
    if (charge.posted) {
      try {
        await this.detectUsageSpike(event);
      } catch (error) {
        this.logger.warn(
          withRequestId(
            `Unable to evaluate credit usage spike for ${input.userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    return { event, charged: charge.posted };
  }

  /**
   * Detects a tenant-level usage spike after the new event is durable.
   *
   * The comparison is deliberately tenant-wide rather than resource-wide:
   * an integration bug can move several metered resources at once, and a
   * shared tenant total catches that pattern. The current window is the
   * configured number of minutes (default 60) ending at the new event and
   * includes that event. The baseline is the average total of the immediately
   * preceding equal-length windows that contain at least one prior event;
   * requiring at
   * least CREDITS_USAGE_SPIKE_MIN_SAMPLES prior events (default 3) keeps a new
   * tenant from producing a meaningless percentage. The absolute minimum
   * amount (default 10,000 minor units) suppresses alerts for tiny tenants
   * where normal rounding or one small event would otherwise look like a
   * large ratio. A spike therefore needs
   * all three signals: enough history, a meaningful absolute total, and a
   * total at least CREDITS_USAGE_SPIKE_MULTIPLIER (default 5.0) times the
   * baseline.
   *
   * This method is observational. Its caller catches every failure after
   * the charge, and the SMTP implementation below is independently
   * best-effort, so neither an alert problem nor a provider outage can roll
   * back usage accounting.
   */
  private async detectUsageSpike(event: MeteredUsageEvent): Promise<void> {
    const windowMinutes = this.getUsageSpikeWindowMinutes();
    const multiplier = this.getUsageSpikeMultiplier();
    const minimumAmount = this.getUsageSpikeMinimumAmount();
    const minimumSamples = this.getUsageSpikeMinimumSamples();
    const windowMs = windowMinutes * 60_000;
    const baselineWindowCount = Math.max(3, minimumSamples);
    const eventTime =
      event.createdAt instanceof Date
        ? new Date(event.createdAt.getTime())
        : new Date();
    const currentWindowStart = eventTime.getTime() - windowMs;
    const historyStart = currentWindowStart - windowMs * baselineWindowCount;
    const history = await this.usageRepository.find({
      where: {
        userId: event.userId,
        createdAt: MoreThanOrEqual(new Date(historyStart)),
      },
      order: { createdAt: 'ASC' },
    });

    const relevantHistory = (history ?? []).filter((candidate) => {
      const timestamp = candidate.createdAt.getTime();
      return timestamp >= historyStart && timestamp <= eventTime.getTime();
    });
    const priorEvents = relevantHistory.filter(
      (candidate) => candidate.createdAt.getTime() < currentWindowStart,
    );
    if (priorEvents.length < minimumSamples) {
      return;
    }

    const priorWindowTotals = new Map<number, number>();
    for (const priorEvent of priorEvents) {
      const windowIndex = Math.floor(
        (currentWindowStart - priorEvent.createdAt.getTime()) / windowMs,
      );
      if (windowIndex >= 0 && windowIndex < baselineWindowCount) {
        priorWindowTotals.set(
          windowIndex,
          (priorWindowTotals.get(windowIndex) ?? 0) + priorEvent.amount,
        );
      }
    }
    const observedPriorWindowTotals = [...priorWindowTotals.values()];
    if (observedPriorWindowTotals.length === 0) {
      return;
    }
    const baselineAverage =
      observedPriorWindowTotals.reduce((sum, total) => sum + total, 0) /
      observedPriorWindowTotals.length;

    const currentEvents = relevantHistory.filter(
      (candidate) => candidate.createdAt.getTime() >= currentWindowStart,
    );
    if (!currentEvents.some((candidate) => candidate.id === event.id)) {
      currentEvents.push(event);
    }
    const windowTotal = currentEvents.reduce(
      (sum, candidate) => sum + candidate.amount,
      0,
    );
    if (
      windowTotal < minimumAmount ||
      windowTotal < baselineAverage * multiplier
    ) {
      return;
    }

    const eventAmount = event.amount;
    this.logger.warn(
      withRequestId(
        `ALERT: credit usage spike tenantId=${event.userId} ` +
          `resource=${event.resource} eventAmount=${eventAmount} ` +
          `windowTotal=${windowTotal} baselineAverage=${baselineAverage.toFixed(2)} ` +
          `multiplier=${multiplier} threshold=${minimumAmount}`,
      ),
    );
    this.metrics.recordCreditUsageSpike(event.resource);
    await this.sendUsageSpikeAlert({
      tenantId: event.userId,
      resource: event.resource,
      eventAmount,
      windowTotal,
      baselineAverage,
      multiplier,
      minimumAmount,
    });
  }

  private async sendUsageSpikeAlert(input: {
    tenantId: string;
    resource: string;
    eventAmount: number;
    windowTotal: number;
    baselineAverage: number;
    multiplier: number;
    minimumAmount: number;
  }): Promise<void> {
    try {
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
        '{{company}} credit usage spike alert: tenant {{tenantId}} recorded {{windowTotal}} minor units for {{resource}} in the current {{windowMinutes}} minute window (event {{eventAmount}}, baseline {{baselineAverage}}, multiplier {{multiplier}}, minimum {{minimumAmount}}). Please investigate.',
      );
      await transport.sendMail({
        from,
        to: supportEmail,
        subject: `${this.config.get<string>('COMPANY_NAME', 'ManageHub')} credit usage spike alert`,
        text: template({
          company: this.config.get<string>('COMPANY_NAME', 'ManageHub'),
          tenantId: input.tenantId,
          resource: input.resource,
          windowMinutes: this.getUsageSpikeWindowMinutes(),
          eventAmount: input.eventAmount,
          windowTotal: input.windowTotal,
          baselineAverage: input.baselineAverage.toFixed(2),
          multiplier: input.multiplier,
          minimumAmount: input.minimumAmount,
        }),
      });
    } catch (error) {
      this.logger.warn(
        withRequestId(
          `Unable to send credit usage spike alert email: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  private getUsageSpikeWindowMinutes(): number {
    return this.readPositiveNumberConfig(
      'CREDITS_USAGE_SPIKE_WINDOW_MINUTES',
      60,
    );
  }

  private getUsageSpikeMultiplier(): number {
    return this.readPositiveNumberConfig(
      'CREDITS_USAGE_SPIKE_MULTIPLIER',
      5.0,
    );
  }

  private getUsageSpikeMinimumAmount(): number {
    return this.readPositiveNumberConfig(
      'CREDITS_USAGE_SPIKE_MIN_AMOUNT',
      10_000,
    );
  }

  private getUsageSpikeMinimumSamples(): number {
    return this.readPositiveIntegerConfig(
      'CREDITS_USAGE_SPIKE_MIN_SAMPLES',
      3,
    );
  }

  private readPositiveNumberConfig(key: string, fallback: number): number {
    const configured = Number(this.config.get<number>(key, fallback));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : fallback;
  }

  private readPositiveIntegerConfig(key: string, fallback: number): number {
    return Math.floor(this.readPositiveNumberConfig(key, fallback));
  }

  async listForUser(userId: string, limit = 100): Promise<MeteredUsageEvent[]> {
    return this.usageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }
}
