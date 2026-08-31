import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentFailureReason } from './enums/payment-failure-reason.enum';
import { ConfirmationSource } from './enums/confirmation-source.enum';
import { assertValidTransition } from './payment-state-machine';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { PaymentsGateway } from './payments.gateway';
import { PaymentRailRegistry } from './payment-rail-registry';
import { withTimeout } from './utils/with-timeout';
import { MetricsService } from '../common/metrics.service';
import { withRequestId } from '../common/request-context';
import { createTransport } from 'nodemailer';
import Handlebars from 'handlebars';

export interface ReconciliationSummary {
  candidates: number;
  resolved: number;
  pending: number;
  providerErrors: number;
  escalatedToManualReview: number;
  expiredSwept: number;
}

export interface ReconciliationMetrics {
  manualReviewQueueDepth: number;
  alertThreshold: number;
  alerting: boolean;
}

type ReconcileOutcome = 'resolved' | 'pending' | 'provider_error' | 'escalated';

/**
 * Scheduled reconciliation (issue #1572): treats provider truth as
 * authoritative and self-heals drift for payments a webhook never
 * confirmed. Reuses PaymentConfirmationService.apply — the same idempotent
 * path the webhook and verify-on-return paths use — so a payment resolved
 * here can never be double-applied, and re-running this job is always safe.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  /**
   * Overlap guard (issue #1701): nothing bounds how long a full
   * PAYMENT_RECONCILE_MAX_BATCH pass can take against a slow or degraded
   * provider — 500 payments each waiting up to PAYMENT_VERIFY_TIMEOUT_MS
   * sequentially can exceed the 5-minute cron interval. Rather than let a
   * second @Cron firing start reconciling the same payments concurrently
   * (double `reconciliationAttempts` increments, duplicate provider calls),
   * a run in progress makes the next tick a no-op. Process-local by design,
   * matching this job's single-instance deployment; a multi-instance
   * deployment would need SettlementService's `pg_advisory_xact_lock`
   * pattern instead.
   */
  private isRunning = false;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly confirmationService: PaymentConfirmationService,
    private readonly railRegistry: PaymentRailRegistry,
    private readonly gateway: PaymentsGateway,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        withRequestId(
          'Skipping reconciliation pass: the previous pass is still running',
        ),
      );
      return;
    }

    this.isRunning = true;
    try {
      const started = Date.now();
      const summary = await this.reconcileDueBatch();
      this.metrics.recordReconciliationPass(Date.now() - started);
      this.logger.log(withRequestId(`Reconciliation pass: ${JSON.stringify(summary)}`));
      const metrics = await this.getMetrics();
      this.metrics.setManualReviewDepth(metrics.manualReviewQueueDepth);
      if (metrics.alerting) {
        this.logger.warn(
          withRequestId(
            `ALERT: manual-review queue depth ${metrics.manualReviewQueueDepth} ` +
              `exceeds threshold ${metrics.alertThreshold}`,
          ),
        );
        await this.sendManualReviewAlert(metrics.manualReviewQueueDepth, metrics.alertThreshold);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * The directly-testable core: sweeps expired payments, then reconciles
   * every AWAITING_CONFIRMATION payment that's due for a poll (past the
   * short threshold, respecting each payment's own backoff schedule).
   */
  async reconcileDueBatch(
    now: Date = new Date(),
  ): Promise<ReconciliationSummary> {
    const expiredSwept = await this.sweepExpired(now);

    const maxBatch = this.config.get<number>(
      'PAYMENT_RECONCILE_MAX_BATCH',
      500,
    );
    const awaiting = await this.paymentRepository.find({
      where: { status: PaymentStatus.AWAITING_CONFIRMATION },
      take: maxBatch,
    });

    const summary: ReconciliationSummary = {
      candidates: 0,
      resolved: 0,
      pending: 0,
      providerErrors: 0,
      escalatedToManualReview: 0,
      expiredSwept,
    };

    for (const payment of awaiting) {
      if (!this.isDueForPoll(payment, now)) {
        continue;
      }
      summary.candidates++;
      const outcome = await this.reconcileOne(payment, now);
      switch (outcome) {
        case 'resolved':
          summary.resolved++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'provider_error':
          summary.providerErrors++;
          break;
        case 'escalated':
          summary.escalatedToManualReview++;
          break;
      }
    }

    return summary;
  }

  /** Admin recovery action: reconcile one payment immediately, bypassing the due-schedule. */
  async forceReconcileNow(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentOrThrow(paymentId);
    if (payment.status !== PaymentStatus.AWAITING_CONFIRMATION) {
      throw new UnprocessableEntityException(
        `Payment in status ${payment.status} is not awaiting confirmation`,
      );
    }
    await this.reconcileOne(payment, new Date());
    return this.getPaymentOrThrow(paymentId);
  }

  /** Admin recovery action: resolve a MANUAL_REVIEW payment by hand — reason required, audited. */
  async resolveManually(
    paymentId: string,
    resolution: PaymentStatus.CONFIRMED | PaymentStatus.FAILED,
    reason: string,
  ): Promise<Payment> {
    this.assertReason(reason, 'resolve a payment manually');
    const payment = await this.getPaymentOrThrow(paymentId);
    assertValidTransition(payment.status, resolution);

    payment.status = resolution;
    payment.manualReviewReason = reason;
    if (resolution === PaymentStatus.FAILED) {
      payment.failureReason = PaymentFailureReason.DECLINED;
    }
    const saved = await this.paymentRepository.save(payment);
    this.gateway.emitPaymentUpdate(saved.id, saved.status);
    this.logger.log(
      `Payment ${paymentId} manually resolved to ${resolution}: ${reason}`,
    );
    return saved;
  }

  /** Admin recovery action: closes a payment out without resolving it CONFIRMED/FAILED. */
  async void(paymentId: string, reason: string): Promise<Payment> {
    this.assertReason(reason, 'void a payment');
    const payment = await this.getPaymentOrThrow(paymentId);
    assertValidTransition(payment.status, PaymentStatus.VOIDED);

    payment.status = PaymentStatus.VOIDED;
    payment.manualReviewReason = reason;
    const saved = await this.paymentRepository.save(payment);
    this.gateway.emitPaymentUpdate(saved.id, saved.status);
    this.logger.log(`Payment ${paymentId} voided: ${reason}`);
    return saved;
  }

  async listManualReview(): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { status: PaymentStatus.MANUAL_REVIEW },
      order: { updatedAt: 'ASC' },
    });
  }

  async getMetrics(): Promise<ReconciliationMetrics> {
    const manualReviewQueueDepth = await this.paymentRepository.count({
      where: { status: PaymentStatus.MANUAL_REVIEW },
    });
    const alertThreshold = this.config.get<number>(
      'PAYMENT_MANUAL_REVIEW_ALERT_THRESHOLD',
      20,
    );
    return {
      manualReviewQueueDepth,
      alertThreshold,
      alerting: manualReviewQueueDepth > alertThreshold,
    };
  }

  private async sendManualReviewAlert(
    depth: number,
    threshold: number,
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
      '{{company}} manual-review queue alert: {{depth}} payments exceed the threshold of {{threshold}}. Please investigate.',
    );

    try {
      await transport.sendMail({
        from,
        to: supportEmail,
        subject: `${this.config.get<string>('COMPANY_NAME', 'ManageHub')} manual review queue alert`,
        text: template({
          company: this.config.get<string>('COMPANY_NAME', 'ManageHub'),
          depth,
          threshold,
        }),
      });
    } catch (error) {
      this.logger.warn(
        withRequestId(
          `Unable to send manual-review alert email: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  /**
   * INITIATED past its TTL never even reached the provider (the user never
   * returned to complete checkout) — ABANDONED. AWAITING_CONFIRMATION past
   * its TTL did start, but nothing ever confirmed it in time — EXPIRED.
   */
  private async sweepExpired(now: Date): Promise<number> {
    const expired = await this.paymentRepository.find({
      where: [
        { status: PaymentStatus.INITIATED, expiresAt: LessThan(now) },
        {
          status: PaymentStatus.AWAITING_CONFIRMATION,
          expiresAt: LessThan(now),
        },
      ],
    });

    for (const payment of expired) {
      const reason =
        payment.status === PaymentStatus.INITIATED
          ? PaymentFailureReason.ABANDONED
          : PaymentFailureReason.EXPIRED;
      assertValidTransition(payment.status, PaymentStatus.EXPIRED);
      payment.status = PaymentStatus.EXPIRED;
      payment.failureReason = reason;
      await this.paymentRepository.save(payment);
      this.gateway.emitPaymentUpdate(payment.id, payment.status);
    }

    return expired.length;
  }

  private async reconcileOne(
    payment: Payment,
    now: Date,
  ): Promise<ReconcileOutcome> {
    if (!payment.providerReference) {
      this.logger.warn(
        `Payment ${payment.id} is AWAITING_CONFIRMATION with no providerReference`,
      );
      return this.recordAttempt(payment, now, { providerError: true });
    }

    const timeoutMs = this.config.get<number>(
      'PAYMENT_VERIFY_TIMEOUT_MS',
      3000,
    );
    let outcome: 'confirmed' | 'failed' | 'pending';
    try {
      const result = await withTimeout(
        this.railRegistry
          .get(payment.rail)
          .verifyByReference(payment.providerReference),
        timeoutMs,
      );
      outcome = result.outcome;
    } catch (error) {
      this.logger.warn(
        `Reconciliation verify failed for payment ${payment.id}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
      return this.recordAttempt(payment, now, { providerError: true });
    }

    if (outcome === 'pending') {
      return this.recordAttempt(payment, now, { providerError: false });
    }

    const rawPayloadHash = PaymentConfirmationService.hashPayload(
      Buffer.from(
        JSON.stringify({
          providerReference: payment.providerReference,
          outcome,
        }),
      ),
    );
    const applied = await this.confirmationService.apply(
      payment.providerReference,
      outcome,
      ConfirmationSource.RECONCILIATION,
      rawPayloadHash,
    );

    await this.paymentRepository.update(payment.id, {
      lastReconciledAt: now,
      providerErrorStreak: 0,
      reconciliationAttempts: payment.reconciliationAttempts + 1,
      // Only tag a failure reason if this call is what actually resolved it
      // to FAILED — a race where the webhook already settled it first
      // (to CONFIRMED, say) must not be overwritten.
      ...(applied?.status === PaymentStatus.FAILED
        ? { failureReason: PaymentFailureReason.DECLINED }
        : {}),
    });

    return 'resolved';
  }

  /**
   * Persists the attempt (always — this is what makes a re-run idempotent
   * and what drives backoff scheduling), then decides whether this
   * payment has earned MANUAL_REVIEW escalation.
   *
   * Escalation is deliberately withheld whenever THIS attempt itself was a
   * provider error — a provider-side outage must never mass-flag every
   * in-flight payment after a single bad run. Only an attempt that
   * successfully reached the provider (and got "still pending") can push
   * an old-enough payment into MANUAL_REVIEW.
   */
  private async recordAttempt(
    payment: Payment,
    now: Date,
    opts: { providerError: boolean },
  ): Promise<ReconcileOutcome> {
    const attempts = payment.reconciliationAttempts + 1;
    const providerErrorStreak = opts.providerError
      ? payment.providerErrorStreak + 1
      : 0;

    await this.paymentRepository.update(payment.id, {
      reconciliationAttempts: attempts,
      providerErrorStreak,
      lastReconciledAt: now,
    });

    const manualReviewAfterHours = this.config.get<number>(
      'PAYMENT_MANUAL_REVIEW_AFTER_HOURS',
      24,
    );
    const ageMs = now.getTime() - payment.createdAt.getTime();
    const shouldEscalate =
      !opts.providerError && ageMs >= manualReviewAfterHours * 3_600_000;

    if (!shouldEscalate) {
      return opts.providerError ? 'provider_error' : 'pending';
    }

    const fresh = await this.getPaymentOrThrow(payment.id);
    assertValidTransition(fresh.status, PaymentStatus.MANUAL_REVIEW);
    fresh.status = PaymentStatus.MANUAL_REVIEW;
    fresh.manualReviewReason = `Unresolved after ${attempts} reconciliation attempts (${(ageMs / 3_600_000).toFixed(1)}h old)`;
    await this.paymentRepository.save(fresh);
    this.gateway.emitPaymentUpdate(fresh.id, fresh.status);
    return 'escalated';
  }

  /**
   * Base backoff doubles per attempt (capped) — a bank-side hold that
   * stays "still processing" for a long time gets polled less and less
   * often instead of every single cron tick.
   */
  private isDueForPoll(payment: Payment, now: Date): boolean {
    const dueAfterMinutes = this.config.get<number>(
      'PAYMENT_RECONCILE_DUE_AFTER_MINUTES',
      5,
    );
    const ageMs = now.getTime() - payment.createdAt.getTime();
    if (ageMs < dueAfterMinutes * 60_000) {
      return false;
    }
    if (!payment.lastReconciledAt) {
      return true;
    }

    const backoffMinutes = this.computeBackoffMinutes(
      payment.reconciliationAttempts,
    );
    const dueAt = payment.lastReconciledAt.getTime() + backoffMinutes * 60_000;
    return now.getTime() >= dueAt;
  }

  private computeBackoffMinutes(attempts: number): number {
    const baseMinutes = this.config.get<number>(
      'PAYMENT_RECONCILE_BACKOFF_BASE_MINUTES',
      5,
    );
    const maxMinutes = this.config.get<number>(
      'PAYMENT_RECONCILE_BACKOFF_MAX_MINUTES',
      60,
    );
    return Math.min(baseMinutes * 2 ** attempts, maxMinutes);
  }

  private assertReason(reason: string, action: string): void {
    if (!reason?.trim()) {
      throw new BadRequestException(`A reason is required to ${action}`);
    }
  }

  private async getPaymentOrThrow(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
