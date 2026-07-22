import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository, Between } from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentProvider } from '../../payments/enums/payment-provider.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { PaystackProvider } from '../../payments/providers/paystack.provider';
import { PaymentOutcomeProvider } from '../../payments/providers/payment-outcome.provider';

const VERIFY_AFTER_MINUTES = 15;
const MANUAL_REVIEW_AFTER_HOURS = 24;

@Injectable()
export class ReconcilePendingPaymentsProvider {
  private readonly logger = new Logger(ReconcilePendingPaymentsProvider.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly paystackProvider: PaystackProvider,
    private readonly paymentOutcomeProvider: PaymentOutcomeProvider,
  ) {}

  @Cron('*/15 * * * *')
  async reconcilePendingPaystackPayments(): Promise<void> {
    const now = Date.now();
    const verifyCutoff = new Date(now - VERIFY_AFTER_MINUTES * 60 * 1000);
    const manualReviewCutoff = new Date(
      now - MANUAL_REVIEW_AFTER_HOURS * 60 * 60 * 1000,
    );

    await this.logManualReviewPayments(manualReviewCutoff);

    const payments = await this.paymentsRepository.find({
      where: {
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.PENDING,
        providerReference: Not(IsNull()),
        createdAt: Between(manualReviewCutoff, verifyCutoff),
       
      },
      order: { createdAt: 'ASC' },
    });

    let reconciled = 0;

    for (const payment of payments) {
      try {
        const reference = payment.providerReference;
        if (!reference) continue;

        const transaction = await this.paystackProvider.verifyTransaction(
          reference,
        );
        const status = transaction.status;

        if (status === 'success') {
          await this.paymentOutcomeProvider.handleChargeSuccess(
            reference,
            transaction,
            'paystack.reconciliation',
          );
          reconciled += 1;
        } else if (this.isFailedStatus(status)) {
          await this.paymentOutcomeProvider.handleChargeFailed(
            reference,
            'paystack.reconciliation',
          );
          reconciled += 1;
        } else {
          this.logger.log(
            `Payment ${payment.id} remains pending after Paystack verify: ${String(status)}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to reconcile payment "${payment.id}": ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Payment reconciliation run complete: ${reconciled}/${payments.length} pending payment(s) resolved.`,
    );
  }

  private async logManualReviewPayments(cutoff: Date): Promise<void> {
    const stalePayments = await this.paymentsRepository.find({
      where: {
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.PENDING,
        providerReference: Not(IsNull()),
        createdAt: LessThan(cutoff),
      },
      order: { createdAt: 'ASC' },
    });

    for (const payment of stalePayments) {
      this.logger.warn(
        `Payment ${payment.id} has been PENDING for more than ${MANUAL_REVIEW_AFTER_HOURS}h and needs manual review.`,
      );
    }
  }

  private isFailedStatus(status: unknown): boolean {
    return ['failed', 'abandoned', 'reversed'].includes(String(status));
  }
}
