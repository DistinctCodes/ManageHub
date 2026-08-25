import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PaymentCreditApplication } from './entities/payment-credit-application.entity';
import { PaymentCreditApplicationKind } from './enums/payment-credit-application-kind.enum';
import { CreditsService } from './credits.service';
import { RevenueSplitService } from './revenue-split.service';

/**
 * A Payment declares itself a credit top-up by carrying this in its
 * `metadata.purpose` at initiation time (issue #1575). Chosen over a new
 * column on `payments` so the credits module stays additive: nothing in
 * the payments module has to know this module exists.
 */
export const CREDIT_TOP_UP_PURPOSE = 'CREDIT_TOP_UP';

export interface PaymentSweepSummary {
  candidates: number;
  applied: number;
  skipped: number;
  failed: number;
}

/**
 * The bridge between the payment rails (#1570 fiat, #1574 on-chain) and
 * the credit ledger (issue #1575).
 *
 * It works by **sweeping CONFIRMED payments** rather than by being called
 * from the confirmation path, and that is a design choice with three
 * payoffs:
 *
 *  - the dependency stays one-directional (credits reads payments), so
 *    neither module has to be wired into the other's lifecycle;
 *  - a payment confirmed while this service was down is still picked up on
 *    the next pass — the effect is self-healing, not fire-and-forget;
 *  - it is idempotent by construction. The unique ledger transaction
 *    reference (`top-up:payment:<id>` / `payment-split:<id>`) is the real
 *    guard, so a crash between posting the ledger effect and marking the
 *    application applied cannot double-credit anyone.
 */
@Injectable()
export class PaymentCreditsService {
  private readonly logger = new Logger(PaymentCreditsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentCreditApplication)
    private readonly applicationRepository: Repository<PaymentCreditApplication>,
    private readonly credits: CreditsService,
    private readonly splits: RevenueSplitService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    const summary = await this.sweepConfirmedPayments();
    if (summary.candidates > 0) {
      this.logger.log(`Payment credit sweep: ${JSON.stringify(summary)}`);
    }
  }

  /**
   * Attaches a revenue split config to a Payment so the amount is
   * distributed across its recipients once the payment confirms. Allowed
   * before OR after confirmation, as long as it has not been applied yet
   * — attaching to an already-applied payment would silently do nothing,
   * so it is refused instead.
   */
  async attachSplitConfig(
    paymentId: string,
    splitConfigId: string,
  ): Promise<PaymentCreditApplication> {
    const payment = await this.getPayment(paymentId);
    const config = await this.splits.getConfig(splitConfigId);
    this.splits.assertUsableForPayment(config);

    const existing = await this.applicationRepository.findOne({
      where: { paymentId },
    });
    if (existing?.appliedAt) {
      throw new UnprocessableEntityException(
        `Payment ${paymentId} has already been applied to the credit ledger`,
      );
    }

    const application =
      existing ??
      this.applicationRepository.create({
        paymentId: payment.id,
        kind: PaymentCreditApplicationKind.REVENUE_SPLIT,
      });
    application.kind = PaymentCreditApplicationKind.REVENUE_SPLIT;
    application.splitConfigId = config.id;
    return this.applicationRepository.save(application);
  }

  /**
   * Explicitly marks a Payment as funding the payer's credit balance —
   * the alternative to the `metadata.purpose` convention, for a caller
   * that could not set metadata at initiation time.
   */
  async markAsTopUp(paymentId: string): Promise<PaymentCreditApplication> {
    const payment = await this.getPayment(paymentId);
    const existing = await this.applicationRepository.findOne({
      where: { paymentId },
    });
    if (existing?.appliedAt) {
      throw new UnprocessableEntityException(
        `Payment ${paymentId} has already been applied to the credit ledger`,
      );
    }

    const application =
      existing ??
      this.applicationRepository.create({
        paymentId: payment.id,
        kind: PaymentCreditApplicationKind.TOP_UP,
      });
    application.kind = PaymentCreditApplicationKind.TOP_UP;
    application.splitConfigId = null;
    return this.applicationRepository.save(application);
  }

  async getApplication(
    paymentId: string,
  ): Promise<PaymentCreditApplication | null> {
    return this.applicationRepository.findOne({ where: { paymentId } });
  }

  /**
   * Applies one CONFIRMED payment's ledger effect. Called by the sweep and
   * by the synchronous endpoint the checkout-return flow can hit so a
   * top-up is spendable immediately rather than at the next cron tick.
   */
  async applyPayment(paymentId: string): Promise<PaymentCreditApplication> {
    const payment = await this.getPayment(paymentId);
    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new UnprocessableEntityException(
        `Payment ${paymentId} is ${payment.status}; only a CONFIRMED payment ` +
          'can be applied to the credit ledger',
      );
    }

    const application = await this.resolveApplication(payment);
    if (application.appliedAt) {
      return application;
    }

    try {
      const transactionId = await this.postEffect(payment, application);
      application.ledgerTransactionId = transactionId;
      application.appliedAt = new Date();
      application.lastError = null;
      return await this.applicationRepository.save(application);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      application.lastError = message;
      await this.applicationRepository.save(application);
      throw error;
    }
  }

  /**
   * Finds CONFIRMED payments with an unapplied credit effect and applies
   * them. Bounded per pass, and the "not yet applied" filter is part of
   * the SQL — so a backlog drains over successive passes instead of the
   * same rows being re-examined forever.
   */
  async sweepConfirmedPayments(): Promise<PaymentSweepSummary> {
    const max = this.config.get<number>('CREDITS_PAYMENT_SWEEP_MAX_BATCH', 200);
    const candidates = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin(
        PaymentCreditApplication,
        'application',
        'application.payment_id = payment.id',
      )
      .where('payment.status = :status', { status: PaymentStatus.CONFIRMED })
      .andWhere('application.applied_at IS NULL')
      .andWhere(
        `(payment.metadata ->> 'purpose' = :purpose OR ` +
          `application.split_config_id IS NOT NULL OR ` +
          `application.kind IS NOT NULL)`,
        { purpose: CREDIT_TOP_UP_PURPOSE },
      )
      .orderBy('payment.updated_at', 'ASC')
      .take(max)
      .getMany();

    const summary: PaymentSweepSummary = {
      candidates: candidates.length,
      applied: 0,
      skipped: 0,
      failed: 0,
    };

    for (const payment of candidates) {
      try {
        const application = await this.applyPayment(payment.id);
        if (application.appliedAt) {
          summary.applied++;
        } else {
          summary.skipped++;
        }
      } catch (error) {
        summary.failed++;
        this.logger.error(
          `Could not apply payment ${payment.id} to the credit ledger: ` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }

    return summary;
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async postEffect(
    payment: Payment,
    application: PaymentCreditApplication,
  ): Promise<string> {
    if (application.kind === PaymentCreditApplicationKind.TOP_UP) {
      const { transaction } = await this.credits.topUpFromPayment({
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
      });
      return transaction.id;
    }

    if (!application.splitConfigId) {
      throw new UnprocessableEntityException(
        `Payment ${payment.id} is marked for a revenue split but has no ` +
          'split config attached',
      );
    }
    const { transaction } = await this.splits.distributePayment({
      paymentId: payment.id,
      configId: application.splitConfigId,
      amount: payment.amount,
      currency: payment.currency,
    });
    return transaction.id;
  }

  /**
   * Resolves what to do with a payment: an explicit application row wins,
   * otherwise the `metadata.purpose` convention creates a TOP_UP row. A
   * payment with neither has no credit-ledger effect at all, which is not
   * an error to sweep past but IS an error to ask for by id.
   */
  private async resolveApplication(
    payment: Payment,
  ): Promise<PaymentCreditApplication> {
    const existing = await this.applicationRepository.findOne({
      where: { paymentId: payment.id },
    });
    if (existing) {
      return existing;
    }

    const purpose = (payment.metadata ?? {})['purpose'];
    if (purpose !== CREDIT_TOP_UP_PURPOSE) {
      throw new UnprocessableEntityException(
        `Payment ${payment.id} has no credit-ledger effect: it is not marked ` +
          `as a ${CREDIT_TOP_UP_PURPOSE} and has no revenue split attached`,
      );
    }

    return this.applicationRepository.save(
      this.applicationRepository.create({
        paymentId: payment.id,
        kind: PaymentCreditApplicationKind.TOP_UP,
      }),
    );
  }

  private async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    return payment;
  }
}
