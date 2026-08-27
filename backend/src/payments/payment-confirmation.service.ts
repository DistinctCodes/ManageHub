import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ConfirmationEvent } from './entities/confirmation-event.entity';
import { ConfirmationSource } from './enums/confirmation-source.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentVerificationOutcome } from './interfaces/payment-rail-adapter.interface';
import { PaymentsService } from './payments.service';
import { PaymentsGateway } from './payments.gateway';
import { PaymentRailRegistry } from './payment-rail-registry';
import { withTimeout } from './utils/with-timeout';
import { withRequestId } from '../common/request-context';

const DEFAULT_VERIFY_TIMEOUT_MS = 3000;

const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.CONFIRMED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

/**
 * The single place that turns a rail's "confirmed"/"failed"/"pending"
 * outcome into a Payment state change (or a deliberate no-op) — shared by
 * both the webhook path and the verify-on-return fast path, so both
 * converge on identical idempotency/ordering semantics (issue #1571).
 *
 * A terminal Payment status is never overwritten by a later event; every
 * event received is logged regardless of whether it changed anything.
 */
@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(ConfirmationEvent)
    private readonly eventRepository: Repository<ConfirmationEvent>,
    private readonly paymentsService: PaymentsService,
    private readonly gateway: PaymentsGateway,
    private readonly railRegistry: PaymentRailRegistry,
    private readonly config: ConfigService,
  ) {}

  static hashPayload(rawBody: Buffer): string {
    return createHash('sha256').update(rawBody).digest('hex');
  }

  /**
   * Applies a confirmation outcome for the Payment matching
   * `providerReference`. Returns the (possibly unchanged) Payment, or null
   * if no Payment matches the reference at all.
   */
  async apply(
    providerReference: string,
    outcome: PaymentVerificationOutcome,
    source: ConfirmationSource,
    rawPayloadHash: string,
  ): Promise<Payment | null> {
    const payment = await this.paymentRepository.findOne({
      where: { providerReference },
    });

    if (!payment) {
      await this.logEvent({
        paymentId: null,
        providerReference,
        source,
        rawPayloadHash,
        previousStatus: null,
        resultingStatus: null,
        applied: false,
        anomaly: 'payment_not_found',
      });
      this.logger.warn(
        withRequestId(
          `Confirmation event for unknown providerReference=${providerReference}`,
        ),
      );
      return null;
    }

    if (TERMINAL_STATUSES.has(payment.status)) {
      const anomaly = PaymentConfirmationService.describeReplay(
        payment.status,
        outcome,
      );
      await this.logEvent({
        paymentId: payment.id,
        providerReference,
        source,
        rawPayloadHash,
        previousStatus: payment.status,
        resultingStatus: payment.status,
        applied: false,
        anomaly,
      });
      return payment;
    }

    if (outcome === 'pending') {
      await this.logEvent({
        paymentId: payment.id,
        providerReference,
        source,
        rawPayloadHash,
        previousStatus: payment.status,
        resultingStatus: payment.status,
        applied: false,
        anomaly: null,
      });
      return payment;
    }

    const previousStatus = payment.status;
    const nextStatus =
      outcome === 'confirmed' ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED;

    this.paymentsService.transitionStatus(payment, nextStatus);
    const saved = await this.paymentRepository.save(payment);

    await this.logEvent({
      paymentId: saved.id,
      providerReference,
      source,
      rawPayloadHash,
      previousStatus,
      resultingStatus: nextStatus,
      applied: true,
      anomaly: null,
    });

    this.gateway.emitPaymentUpdate(saved.id, saved.status);

    return saved;
  }

  /**
   * Bounded synchronous fast path for the checkout-return leg (issue
   * #1571): calls the rail's verify-by-reference API instead of waiting on
   * the async webhook, so a time-sensitive flow (unlocking a room, a
   * day-pass) doesn't have to sit in AWAITING_CONFIRMATION for however
   * long the webhook takes. The webhook remains authoritative and can
   * still supersede this later — `apply` is the same idempotent path
   * either way, so whichever arrives first "wins" the transition and the
   * other becomes a no-op replay.
   *
   * Hard rule: `verified: false` (timeout, provider error, or a `pending`
   * response) NEVER implies a status change. Only an authoritative
   * confirmed/failed response from the provider moves the Payment.
   */
  async verifyOnReturn(
    payment: Payment,
  ): Promise<{ payment: Payment; verified: boolean }> {
    if (TERMINAL_STATUSES.has(payment.status)) {
      return { payment, verified: true };
    }
    if (!payment.providerReference) {
      return { payment, verified: false };
    }

    const timeoutMs = this.config.get<number>(
      'PAYMENT_VERIFY_TIMEOUT_MS',
      DEFAULT_VERIFY_TIMEOUT_MS,
    );

    let result: { outcome: PaymentVerificationOutcome };
    try {
      result = await withTimeout(
        this.railRegistry
          .get(payment.rail)
          .verifyByReference(payment.providerReference),
        timeoutMs,
      );
    } catch (error) {
      this.logger.warn(
        withRequestId(
          `verify-on-return failed for payment ${payment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
      return { payment, verified: false };
    }

    if (result.outcome === 'pending') {
      return { payment, verified: false };
    }

    const rawPayloadHash = PaymentConfirmationService.hashPayload(
      Buffer.from(
        JSON.stringify({
          providerReference: payment.providerReference,
          outcome: result.outcome,
        }),
      ),
    );

    const updated = await this.apply(
      payment.providerReference,
      result.outcome,
      ConfirmationSource.VERIFY_RETURN,
      rawPayloadHash,
    );

    return { payment: updated ?? payment, verified: true };
  }

  /** Logs a webhook that never reached `apply` — invalid signature, malformed payload, etc. */
  async logRejectedWebhook(
    rawPayloadHash: string,
    anomaly: string,
  ): Promise<void> {
    await this.logEvent({
      paymentId: null,
      providerReference: null,
      source: ConfirmationSource.WEBHOOK,
      rawPayloadHash,
      previousStatus: null,
      resultingStatus: null,
      applied: false,
      anomaly,
    });
    this.logger.warn(withRequestId(`Rejected webhook: ${anomaly}`));
  }

  /**
   * A duplicate delivery of the same outcome against an already-terminal
   * payment is expected and not an anomaly. A DIFFERENT outcome arriving
   * after the payment is already terminal is a genuine conflict worth
   * flagging — it's either badly out-of-order delivery or a provider bug.
   */
  private static describeReplay(
    currentStatus: PaymentStatus,
    outcome: PaymentVerificationOutcome,
  ): string | null {
    if (outcome === 'pending') {
      return null;
    }
    const impliedStatus =
      outcome === 'confirmed' ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED;
    return impliedStatus === currentStatus ? null : 'conflicting_event';
  }

  private async logEvent(entry: {
    paymentId: string | null;
    providerReference: string | null;
    source: ConfirmationSource;
    rawPayloadHash: string;
    previousStatus: PaymentStatus | null;
    resultingStatus: PaymentStatus | null;
    applied: boolean;
    anomaly: string | null;
  }): Promise<void> {
    const event = this.eventRepository.create(entry);
    await this.eventRepository.save(event);
  }
}
