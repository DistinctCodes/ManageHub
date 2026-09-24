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
import { ReconciliationRun } from './entities/reconciliation-run.entity';
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
  /** Payments escalated specifically because the total-attempt cap tripped. */
  attemptCapEscalations: number;
  /** Payments escalated specifically because the provider-error streak cap tripped. */
  providerErrorStreakCapEscalations: number;
}

export interface ReconciliationMetrics {
  manualReviewQueueDepth: number;
  alertThreshold: number;
  alerting: boolean;
  confirmationMaxAttempts: number;
  confirmationMaxProviderErrorStreak: number;
  attemptCapEscalations: number;
  providerErrorStreakCapEscalations: number;
}

type ReconcileOutcome = 'resolved' | 'pending' | 'provider_error' | 'escalated';
type ReconciliationCap = 'attempt' | 'provider_error_streak';
type ReconcileResult = {
  outcome: ReconcileOutcome;
  caps?: ReconciliationCap[];
};

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

  private lastRunCapState = {
    attemptCapEscalations: 0,
    providerErrorStreakCapEscalations: 0,
  };

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(ReconciliationRun)
    private readonly runRepository: Repository<ReconciliationRun>,
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
    const startedAt = new Date();
    let run: ReconciliationRun | null = null;
    try {
      run = await this.startRunRecord(startedAt);
      const summary = await this.reconcileDueBatch();
      this.lastRunCapState = {
        attemptCapEscalations: summary.attemptCapEscalations,
        providerErrorStreakCapEscalations:
          summary.providerErrorStreakCapEscalations,
      };
      this.metrics.recordReconciliationPass(Date.now() - startedAt.getTime());
      this.logger.log(
        withRequestId(`Reconciliation pass: ${JSON.stringify(summary)}`),
      );
      const metrics = await this.getMetrics();
      this.metrics.setManualReviewDepth(metrics.manualReviewQueueDepth);
      if (metrics.alerting) {
        this.logger.warn(
          withRequestId(
            `ALERT: manual-review queue depth ${metrics.manualReviewQueueDepth} ` +
              `exceeds threshold ${metrics.alertThreshold}`,
          ),
        );
        await this.sendManualReviewAlert(
          metrics.manualReviewQueueDepth,
          metrics.alertThreshold,
        );
      }
      await this.completeRunRecord(run, summary, startedAt);
    } catch (error) {
      await this.failRunRecord(run, error, startedAt);
      throw error;
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
    // MANUAL_REVIEW is deliberately excluded by the status predicate, and
    // isDueForPoll repeats that exclusion as a defensive guard. A payment
    // that has crossed a cap is therefore never selected on a later pass,
    // even if a stale read briefly shows its previous AWAITING state.
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
      attemptCapEscalations: 0,
      providerErrorStreakCapEscalations: 0,
    };

    for (const payment of awaiting) {
      // A row that was already at a cap when this process started (for
      // example, data written by the pre-cap deployment) is escalated
      // without making one more provider call. This preserves the hard cap
      // instead of merely skipping it forever in AWAITING_CONFIRMATION.
      const reachedCaps = this.getReachedCaps(payment);
      if (reachedCaps.length > 0) {
        if (await this.escalateCappedPayment(payment, reachedCaps)) {
          summary.escalatedToManualReview++;
          for (const cap of reachedCaps) {
            if (cap === 'attempt') {
              summary.attemptCapEscalations++;
            } else {
              summary.providerErrorStreakCapEscalations++;
            }
          }
        }
        continue;
      }
      if (!this.isDueForPoll(payment, now)) {
        continue;
      }
      summary.candidates++;
      const result = await this.reconcileOne(payment, now);
      switch (result.outcome) {
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
      for (const cap of result.caps ?? []) {
        if (cap === 'attempt') {
          summary.attemptCapEscalations++;
        } else {
          summary.providerErrorStreakCapEscalations++;
        }
      }
    }

    this.lastRunCapState = {
      attemptCapEscalations: summary.attemptCapEscalations,
      providerErrorStreakCapEscalations:
        summary.providerErrorStreakCapEscalations,
    };
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
    const reachedCaps = this.getReachedCaps(payment);
    if (reachedCaps.length > 0) {
      await this.escalateCappedPayment(payment, reachedCaps);
    } else {
      await this.reconcileOne(payment, new Date());
    }
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

  /** Returns persisted reconciliation history, newest first, with a bounded take. */
  async listRecentRuns(
    limit: number | string = 50,
  ): Promise<ReconciliationRun[]> {
    const numericLimit = Number(limit);
    const boundedLimit = Number.isFinite(numericLimit)
      ? Math.min(Math.max(Math.floor(numericLimit), 1), 500)
      : 50;
    return this.runRepository.find({
      order: { startedAt: 'DESC' },
      take: boundedLimit,
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
      confirmationMaxAttempts: this.getConfirmationMaxAttempts(),
      confirmationMaxProviderErrorStreak:
        this.getConfirmationMaxProviderErrorStreak(),
      attemptCapEscalations: this.lastRunCapState.attemptCapEscalations,
      providerErrorStreakCapEscalations:
        this.lastRunCapState.providerErrorStreakCapEscalations,
    };
  }

  private async startRunRecord(
    startedAt: Date,
  ): Promise<ReconciliationRun | null> {
    try {
      const run = this.runRepository.create({
        startedAt,
        finishedAt: null,
        durationMs: null,
        candidates: 0,
        resolved: 0,
        pending: 0,
        providerErrors: 0,
        escalatedToManualReview: 0,
        expiredSwept: 0,
        outcome: null,
        error: null,
        details: null,
      });
      return await this.runRepository.save(run);
    } catch (error) {
      this.logRunPersistenceFailure('create', error);
      return null;
    }
  }

  private async completeRunRecord(
    run: ReconciliationRun | null,
    summary: ReconciliationSummary,
    startedAt: Date,
  ): Promise<void> {
    if (!run) {
      return;
    }
    const finishedAt = new Date();
    try {
      await this.runRepository.update(run.id, {
        candidates: summary.candidates,
        resolved: summary.resolved,
        pending: summary.pending,
        providerErrors: summary.providerErrors,
        escalatedToManualReview: summary.escalatedToManualReview,
        expiredSwept: summary.expiredSwept,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        outcome: 'succeeded',
        error: null,
        details: {
          attemptCap: this.getConfirmationMaxAttempts(),
          providerErrorStreakCap:
            this.getConfirmationMaxProviderErrorStreak(),
          attemptCapEscalations: summary.attemptCapEscalations,
          providerErrorStreakCapEscalations:
            summary.providerErrorStreakCapEscalations,
        },
      });
    } catch (error) {
      this.logRunPersistenceFailure('complete', error);
    }
  }

  private async failRunRecord(
    run: ReconciliationRun | null,
    error: unknown,
    startedAt: Date,
  ): Promise<void> {
    if (!run) {
      return;
    }
    const finishedAt = new Date();
    try {
      await this.runRepository.update(run.id, {
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        outcome: 'failed',
        error:
          error instanceof Error
            ? error.message
            : String(error ?? 'Unknown error'),
        details: {
          phase: 'reconciliation',
          attemptCap: this.getConfirmationMaxAttempts(),
          providerErrorStreakCap:
            this.getConfirmationMaxProviderErrorStreak(),
        },
      });
    } catch (persistenceError) {
      this.logRunPersistenceFailure('failure', persistenceError);
    }
  }

  private logRunPersistenceFailure(
    operation: 'create' | 'complete' | 'failure',
    error: unknown,
  ): void {
    this.logger.warn(
      withRequestId(
        `Unable to ${operation} reconciliation run record: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
  }

  private getConfirmationMaxAttempts(): number {
    return this.readPositiveIntegerConfig(
      'PAYMENT_CONFIRMATION_MAX_ATTEMPTS',
      20,
    );
  }

  private getConfirmationMaxProviderErrorStreak(): number {
    return this.readPositiveIntegerConfig(
      'PAYMENT_CONFIRMATION_MAX_PROVIDER_ERROR_STREAK',
      10,
    );
  }

  private readPositiveIntegerConfig(key: string, fallback: number): number {
    const configured = Number(this.config.get<number>(key, fallback));
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : fallback;
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
  ): Promise<ReconcileResult> {
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

    return { outcome: 'resolved' };
  }

  private getReachedCaps(payment: Payment): ReconciliationCap[] {
    const caps: ReconciliationCap[] = [];
    if (
      payment.reconciliationAttempts >= this.getConfirmationMaxAttempts()
    ) {
      caps.push('attempt');
    }
    if (
      payment.providerErrorStreak >=
      this.getConfirmationMaxProviderErrorStreak()
    ) {
      caps.push('provider_error_streak');
    }
    return caps;
  }

  private async escalateCappedPayment(
    payment: Payment,
    caps: ReconciliationCap[],
  ): Promise<boolean> {
    const fresh = await this.getPaymentOrThrow(payment.id);
    if (fresh.status !== PaymentStatus.AWAITING_CONFIRMATION) {
      return false;
    }
    assertValidTransition(fresh.status, PaymentStatus.MANUAL_REVIEW);
    const maxAttempts = this.getConfirmationMaxAttempts();
    const maxProviderErrorStreak =
      this.getConfirmationMaxProviderErrorStreak();
    const capDescriptions: string[] = [];
    if (caps.includes('attempt')) {
      capDescriptions.push(
        `attempt cap ${maxAttempts} reached (${fresh.reconciliationAttempts} total reconciliation attempts)`,
      );
    }
    if (caps.includes('provider_error_streak')) {
      capDescriptions.push(
        `provider-error streak cap ${maxProviderErrorStreak} reached (${fresh.providerErrorStreak} consecutive provider errors)`,
      );
    }
    const description = capDescriptions.join('; ');
    fresh.status = PaymentStatus.MANUAL_REVIEW;
    fresh.manualReviewReason =
      `Confirmation polling stopped: ${description}; ` +
      `total reconciliation attempts: ${fresh.reconciliationAttempts}; ` +
      `provider error streak: ${fresh.providerErrorStreak}.`;
    this.logger.warn(
      withRequestId(
        `ALERT: payment ${fresh.id} reached a confirmation polling cap ` +
          `(${description})`,
      ),
    );
    await this.paymentRepository.save(fresh);
    this.gateway.emitPaymentUpdate(fresh.id, fresh.status);
    return true;
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
   * an old-enough payment into MANUAL_REVIEW or trip the total-attempt cap.
   * The provider-error streak cap is the deliberate exception: a long,
   * bounded streak on one payment is evidence that this payment needs a
   * human, whereas one failed run is evidence only that a provider may be
   * experiencing a broad outage. If a provider-error attempt happens to
   * reach the total-attempt cap first, the next scheduler pass escalates
   * the already-capped row without making another provider call.
   */
  private async recordAttempt(
    payment: Payment,
    now: Date,
    opts: { providerError: boolean },
  ): Promise<ReconcileResult> {
    const attempts = payment.reconciliationAttempts + 1;
    const providerErrorStreak = opts.providerError
      ? payment.providerErrorStreak + 1
      : 0;
    const maxAttempts = this.getConfirmationMaxAttempts();
    const maxProviderErrorStreak =
      this.getConfirmationMaxProviderErrorStreak();

    await this.paymentRepository.update(payment.id, {
      reconciliationAttempts: attempts,
      providerErrorStreak,
      lastReconciledAt: now,
    });

    const caps: ReconciliationCap[] = [];
    if (attempts >= maxAttempts) {
      caps.push('attempt');
    }
    if (providerErrorStreak >= maxProviderErrorStreak) {
      caps.push('provider_error_streak');
    }

    const manualReviewAfterHours = this.config.get<number>(
      'PAYMENT_MANUAL_REVIEW_AFTER_HOURS',
      24,
    );
    const ageMs = now.getTime() - payment.createdAt.getTime();
    const attemptCapReached = caps.includes('attempt');
    const providerErrorStreakCapReached =
      caps.includes('provider_error_streak');
    const shouldEscalate =
      providerErrorStreakCapReached ||
      (!opts.providerError &&
        (attemptCapReached ||
          ageMs >= manualReviewAfterHours * 3_600_000));

    if (!shouldEscalate) {
      return {
        outcome: opts.providerError ? 'provider_error' : 'pending',
        caps: [],
      };
    }

    const fresh = await this.getPaymentOrThrow(payment.id);
    assertValidTransition(fresh.status, PaymentStatus.MANUAL_REVIEW);
    fresh.status = PaymentStatus.MANUAL_REVIEW;
    if (caps.length > 0) {
      const capDescriptions: string[] = [];
      if (caps.includes('attempt')) {
        capDescriptions.push(
          `attempt cap ${maxAttempts} reached (${attempts} total reconciliation attempts)`,
        );
      }
      if (caps.includes('provider_error_streak')) {
        capDescriptions.push(
          `provider-error streak cap ${maxProviderErrorStreak} reached (${providerErrorStreak} consecutive provider errors)`,
        );
      }
      fresh.manualReviewReason =
        `Confirmation polling stopped: ${capDescriptions.join('; ')}; ` +
        `total reconciliation attempts: ${attempts}; ` +
        `provider error streak: ${providerErrorStreak}.`;
      this.logger.warn(
        withRequestId(
          `ALERT: payment ${payment.id} reached a confirmation polling cap ` +
            `(${capDescriptions.join('; ')})`,
        ),
      );
    } else {
      fresh.manualReviewReason =
        `Unresolved after ${attempts} reconciliation attempts ` +
        `(${(ageMs / 3_600_000).toFixed(1)}h old)`;
    }
    await this.paymentRepository.save(fresh);
    this.gateway.emitPaymentUpdate(fresh.id, fresh.status);
    return { outcome: 'escalated', caps };
  }

  /**
   * Base backoff doubles per attempt (capped) — a bank-side hold that
   * stays "still processing" for a long time gets polled less and less
   * often instead of every single cron tick.
   */
  private isDueForPoll(payment: Payment, now: Date): boolean {
    if (payment.status !== PaymentStatus.AWAITING_CONFIRMATION) {
      return false;
    }
    if (
      payment.reconciliationAttempts >= this.getConfirmationMaxAttempts() ||
      payment.providerErrorStreak >=
        this.getConfirmationMaxProviderErrorStreak()
    ) {
      return false;
    }
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
