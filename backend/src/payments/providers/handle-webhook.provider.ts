import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaystackProvider } from './paystack.provider';
import { SorobanEscrowProvider } from './soroban-escrow.provider';
import { BookingsService } from '../../bookings/bookings.service';
import { Booking } from '../../bookings/entities/booking.entity';
import { PlanType } from '../../bookings/enums/plan-type.enum';
import { InvoicesService } from '../../invoices/invoices.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import { UserCredit } from '../../credits/entities/user-credit.entity';
import { UserCreditTransaction } from '../../credits/entities/credit-transaction.entity';
import { CreditTransactionType } from '../../credits/enums/credit-transaction-type.enum';
import { ReferralsService } from '../../referrals/referrals.service';

const LONG_TERM_PLANS = new Set([
  PlanType.MONTHLY,
  PlanType.QUARTERLY,
  PlanType.YEARLY,
]);

@Injectable()
export class HandleWebhookProvider {
  private readonly logger = new Logger(HandleWebhookProvider.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserCredit)
    private readonly userCreditsRepository: Repository<UserCredit>,
    @InjectRepository(UserCreditTransaction)
    private readonly creditTransactionsRepository: Repository<UserCreditTransaction>,
    private readonly paystackProvider: PaystackProvider,
    private readonly sorobanEscrowProvider: SorobanEscrowProvider,
    private readonly bookingsService: BookingsService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly promoCodesService: PromoCodesService,
    private readonly referralsService: ReferralsService,
  ) {}

  async handle(rawBody: Buffer, signature: string): Promise<void> {
    const valid = this.paystackProvider.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    const eventType = event.event as string;
    const data = event.data as Record<string, unknown>;
    const reference = data?.reference as string;

    if (!reference) {
      this.logger.warn(
        `Webhook event "${eventType}" has no reference — skipped`,
      );
      return;
    }

    if (eventType === 'charge.success') {
      await this.handleChargeSuccess(reference, data);
    } else if (eventType === 'charge.failed') {
      await this.handleChargeFailed(reference);
    } else {
      this.logger.log(`Unhandled Paystack event: ${eventType}`);
    }
  }

  private async handleChargeSuccess(
    reference: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { providerReference: reference },
    });

    if (!payment) {
      this.logger.warn(
        `charge.success: no payment found for reference ${reference}`,
      );
      return;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(
        `charge.success: payment ${payment.id} already succeeded — idempotent skip`,
      );
      return;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    payment.metadata = data;
    await this.paymentsRepository.save(payment);

    // Handle credit purchases
    if (payment.metadata && (payment.metadata as Record<string, unknown>).type === 'credit_purchase') {
      await this.handleCreditPurchase(payment);
      return;
    }

    // Confirm the booking
    const booking = await this.bookingsService.confirm(payment.bookingId!);

    // For long-term bookings, record on-chain escrow
    if (LONG_TERM_PLANS.has(booking.planType)) {
      await this.recordSorobanEscrow(payment, booking);
    }

    // Record promo code usage atomically if one was applied
    if (booking.appliedPromoCodeId) {
      this.promoCodesService
        .recordUsage(
          booking.appliedPromoCodeId,
          payment.userId,
          booking.id,
          booking.promoDiscountApplied ?? 0,
        )
        .catch((err: Error) => {
          this.logger.error(
            `Failed to record promo usage for booking ${booking.id}: ${err.message}`,
          );
        });
    }

    // Complete pending referral reward on the referred user's first successful payment
    if (payment.userId) {
      this.referralsService
        .completeReferral(payment.userId)
        .catch((err: Error) => {
          this.logger.error(
            `Failed to complete referral for user ${payment.userId}: ${err.message}`,
          );
        });
    }

    // Generate invoice asynchronously — do not block payment confirmation
    this.invoicesService.generateForPayment(payment.id).catch((err: Error) => {
      this.logger.error(
        `Failed to generate invoice for payment ${payment.id}: ${err.message}`,
      );
    });

    // Send payment success email
    this.usersRepository
      .findOne({ where: { id: payment.userId } })
      .then((user) => {
        this.bookingsRepository
          .findOne({ where: { id: payment.bookingId } })
          .then((bk) => {
            const emailRecipient =
              user?.email ?? (bk?.isGuestBooking ? bk?.guestInfo?.email : null);
            const displayName =
              user?.fullName ??
              (bk?.isGuestBooking ? bk?.guestInfo?.name : null);
            if (!emailRecipient || !displayName) return;
            this.emailService
              .sendPaymentSuccessEmail(emailRecipient, displayName, {
                bookingId: payment.bookingId,
                workspaceName: bk?.workspaceId ?? '',
                amountNaira: (payment.amount / 100).toFixed(2),
                paidAt: payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString()
                  : '',
                invoiceNumber: '',
              })
              .catch(() => void 0);
          })
          .catch(() => void 0);
      })
      .catch(() => void 0);

    // Notify user (skip for guest bookings which have no userId)
    if (payment.userId) {
      this.notificationsService
        .create({
          userId: payment.userId,
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Payment Successful',
          message: `Your payment of ₦${(payment.amount / 100).toFixed(2)} has been confirmed and your booking is now active.`,
          metadata: { paymentId: payment.id, bookingId: payment.bookingId },
        })
        .catch(() => void 0);
    }

    this.logger.log(
      `charge.success: payment ${payment.id} succeeded, booking ${booking.id} confirmed`,
    );
  }

  private async handleChargeFailed(reference: string): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { providerReference: reference },
    });

    if (!payment) {
      this.logger.warn(
        `charge.failed: no payment found for reference ${reference}`,
      );
      return;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return;
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentsRepository.save(payment);

    // Credit purchase payments don't have a booking — skip email/notification
    if (payment.metadata && (payment.metadata as Record<string, unknown>).type === 'credit_purchase') {
      this.logger.log(`charge.failed: credit purchase payment ${payment.id} marked FAILED`);
      return;
    }

    // Send payment failed email
    if (payment.userId) {
      this.usersRepository
        .findOne({ where: { id: payment.userId } })
        .then((user) => {
          if (!user) return;
          this.emailService
            .sendPaymentFailedEmail(user.email, user.fullName, {
              paymentReference: payment.providerReference ?? payment.id,
              amountNaira: (payment.amount / 100).toFixed(2),
            })
            .catch(() => void 0);
        })
        .catch(() => void 0);
    } else {
      // Guest booking — look up email from booking guestInfo
      this.bookingsRepository
        .findOne({ where: { id: payment.bookingId } })
        .then((bk) => {
          if (!bk?.guestInfo?.email) return;
          this.emailService
            .sendPaymentFailedEmail(bk.guestInfo.email, bk.guestInfo.name, {
              paymentReference: payment.providerReference ?? payment.id,
              amountNaira: (payment.amount / 100).toFixed(2),
            })
            .catch(() => void 0);
        })
        .catch(() => void 0);
    }

    if (payment.userId) {
      this.notificationsService
        .create({
          userId: payment.userId,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          metadata: { paymentId: payment.id, bookingId: payment.bookingId },
        })
        .catch(() => void 0);
    }

    this.logger.log(`charge.failed: payment ${payment.id} marked FAILED`);
  }

  private async handleCreditPurchase(payment: Payment): Promise<void> {
    const meta = payment.metadata as Record<string, unknown> | null;
    const creditPackId = meta?.creditPackId as string | undefined;
    const creditHours = Number(meta?.creditHours ?? 0);

    if (!payment.userId || !creditPackId || creditHours <= 0) {
      this.logger.warn(
        `credit_purchase: invalid metadata for payment ${payment.id}`,
      );
      return;
    }

    let userCredit = await this.userCreditsRepository.findOne({
      where: { userId: payment.userId },
    });

    if (!userCredit) {
      userCredit = this.userCreditsRepository.create({
        userId: payment.userId,
        remainingHours: 0,
      });
    }

    userCredit.remainingHours = Number(userCredit.remainingHours) + creditHours;
    await this.userCreditsRepository.save(userCredit);

    const transaction = this.creditTransactionsRepository.create({
      userCreditId: userCredit.id,
      type: CreditTransactionType.PURCHASE,
      hours: creditHours,
      description: `Credit pack purchase (${meta?.creditPackName ?? creditPackId})`,
    });
    await this.creditTransactionsRepository.save(transaction);

    this.notificationsService
      .create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Credit Purchase Successful',
        message: `${creditHours} credit hours have been added to your account.`,
        metadata: { paymentId: payment.id, creditPackId },
      })
      .catch(() => void 0);

    this.logger.log(
      `credit_purchase: payment ${payment.id}, ${creditHours} hours added to user ${payment.userId}`,
    );
  }

  private async recordSorobanEscrow(
    payment: Payment,
    booking: Booking,
  ): Promise<void> {
    try {
      const beneficiary = this.configService.get<string>(
        'STELLAR_BENEFICIARY_ADDRESS',
        'GBENEFIT_PLACEHOLDER',
      );
      const releaseAfterUnix =
        Math.floor(new Date(booking.endDate).getTime() / 1000) + 86400;

      const txHash = await this.sorobanEscrowProvider.createEscrow(
        booking.id,
        payment.userId,
        beneficiary,
        payment.amount,
        `Booking ${booking.id}`,
        releaseAfterUnix,
      );

      await this.bookingsRepository.update(booking.id, {
        sorobanEscrowId: txHash,
      });

      this.logger.log(
        `Soroban escrow recorded for booking ${booking.id}: ${txHash}`,
      );
    } catch (err) {
      // Non-critical — log but do not fail the payment confirmation
      this.logger.error(
        `Failed to record Soroban escrow for booking ${booking.id}: ${(err as Error).message}`,
      );
    }
  }
}
