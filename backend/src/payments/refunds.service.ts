import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { assertValidTransition } from './payment-state-machine';
import { PaymentRailRegistry } from './payment-rail-registry';
import { PaymentsGateway } from './payments.gateway';
import { retryWithBackoff } from './utils/retry-with-backoff';

const REFUNDABLE_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.CONFIRMED,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

export interface RefundResult {
  payment: Payment;
  refund: Refund;
}

/**
 * Refund/partial-refund sub-ledger (issue #1572), layered on #1570's
 * transition guard. A Payment's "amount refunded" is always
 * SUM(refunds.amount), never a single boolean — this is what lets multiple
 * partial refunds accumulate against one payment.
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    private readonly railRegistry: PaymentRailRegistry,
    private readonly gateway: PaymentsGateway,
  ) {}

  /**
   * Atomically validates and books a refund against `paymentId`: locks the
   * payment row for the duration of the check-and-insert so two concurrent
   * refund requests that would together exceed the captured amount can
   * never both succeed — the loser sees a 409, not a corrupted ledger
   * (issue #1572's tested double-refund race).
   */
  async requestRefund(
    paymentId: string,
    amount: number,
    reason: string,
    actorId: string | null,
  ): Promise<RefundResult> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        'Refund amount must be a positive integer (minor units)',
      );
    }
    if (!reason?.trim()) {
      throw new BadRequestException('Refund reason is required');
    }

    const { payment, refund } =
      await this.paymentRepository.manager.transaction(async (manager) =>
        this.bookRefund(manager, paymentId, amount, reason, actorId),
      );

    this.gateway.emitPaymentUpdate(payment.id, payment.status);

    // Best-effort provider-side execution — the ledger above is already the
    // source of truth for "was this refund accepted." A failure here is
    // logged, not rolled back: reconciling a booked-but-not-yet-executed
    // refund against the provider is out of scope for this issue (would
    // need a saga/outbox, tracked separately).
    try {
      await retryWithBackoff(
        () =>
          this.railRegistry
            .get(payment.rail)
            .refund(payment.providerReference ?? '', amount),
        { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 500 },
      );
    } catch (error) {
      this.logger.error(
        `Refund ${refund.id} was booked but the provider call failed after retries: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    return { payment, refund };
  }

  private async bookRefund(
    manager: EntityManager,
    paymentId: string,
    amount: number,
    reason: string,
    actorId: string | null,
  ): Promise<RefundResult> {
    const payment = await manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .setLock('pessimistic_write')
      .where('payment.id = :paymentId', { paymentId })
      .getOne();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (!REFUNDABLE_STATUSES.has(payment.status)) {
      throw new UnprocessableEntityException(
        `Payment in status ${payment.status} cannot be refunded`,
      );
    }

    const alreadyRefunded = await manager
      .getRepository(Refund)
      .createQueryBuilder('refund')
      .select('COALESCE(SUM(refund.amount), 0)', 'total')
      .where('refund.payment_id = :paymentId', { paymentId })
      .getRawOne<{ total: string }>();
    const refundedSoFar = Number(alreadyRefunded?.total ?? 0);
    const remaining = payment.amount - refundedSoFar;

    if (amount > remaining) {
      throw new ConflictException(
        `Refund of ${amount} exceeds the remaining refundable amount (${remaining})`,
      );
    }

    const refund = manager.getRepository(Refund).create({
      paymentId,
      amount,
      reason,
      actorId,
    });
    const savedRefund = await manager.getRepository(Refund).save(refund);

    const nextStatus =
      refundedSoFar + amount >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    if (nextStatus !== payment.status) {
      assertValidTransition(payment.status, nextStatus);
      payment.status = nextStatus;
    }
    const savedPayment = await manager.getRepository(Payment).save(payment);

    return { payment: savedPayment, refund: savedRefund };
  }
}
