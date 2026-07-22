import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { PlanType } from '../../bookings/enums/plan-type.enum';
import { BookingsService } from '../../bookings/bookings.service';
import { EmailService } from '../../email/email.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { SorobanEscrowProvider } from './soroban-escrow.provider';

const LONG_TERM_PLANS = new Set([
  PlanType.MONTHLY,
  PlanType.QUARTERLY,
  PlanType.YEARLY,
]);

@Injectable()
export class PaymentOutcomeProvider {
  private readonly logger = new Logger(PaymentOutcomeProvider.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly sorobanEscrowProvider: SorobanEscrowProvider,
    private readonly bookingsService: BookingsService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async handleChargeSuccess(
    reference: string,
    data: Record<string, unknown>,
    source = 'charge.success',
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { providerReference: reference },
    });

    if (!payment) {
      this.logger.warn(`${source}: no payment found for reference ${reference}`);
      return;
    }

    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.log(
        `${source}: payment ${payment.id} already ${payment.status} - idempotent skip`,
      );
      return;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    payment.metadata = data;
    await this.paymentsRepository.save(payment);

    const booking = await this.bookingsService.confirm(payment.bookingId);

    if (LONG_TERM_PLANS.has(booking.planType)) {
      await this.recordSorobanEscrow(payment, booking);
    }

    this.invoicesService.generateForPayment(payment.id).catch((err: Error) => {
      this.logger.error(
        `Failed to generate invoice for payment ${payment.id}: ${err.message}`,
      );
    });

    this.sendPaymentSuccessEmail(payment);
    this.notifyPaymentSuccess(payment);

    this.logger.log(
      `${source}: payment ${payment.id} succeeded, booking ${booking.id} confirmed`,
    );
  }

  async handleChargeFailed(
    reference: string,
    source = 'charge.failed',
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { providerReference: reference },
    });

    if (!payment) {
      this.logger.warn(`${source}: no payment found for reference ${reference}`);
      return;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.log(
        `${source}: payment ${payment.id} already ${payment.status} - idempotent skip`,
      );
      return;
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentsRepository.save(payment);

    this.sendPaymentFailedEmail(payment);
    this.notifyPaymentFailed(payment);

    this.logger.log(`${source}: payment ${payment.id} marked FAILED`);
  }

  private sendPaymentSuccessEmail(payment: Payment): void {
    this.usersRepository
      .findOne({ where: { id: payment.userId } })
      .then((user) => {
        this.bookingsRepository
          .findOne({ where: { id: payment.bookingId } })
          .then((booking) => {
            const emailRecipient =
              user?.email ??
              (booking?.isGuestBooking ? booking?.guestInfo?.email : null);
            const displayName =
              user?.fullName ??
              (booking?.isGuestBooking ? booking?.guestInfo?.name : null);
            if (!emailRecipient || !displayName) return;

            this.emailService
              .sendPaymentSuccessEmail(emailRecipient, displayName, {
                bookingId: payment.bookingId,
                workspaceName: booking?.workspaceId ?? '',
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
  }

  private sendPaymentFailedEmail(payment: Payment): void {
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
      return;
    }

    this.bookingsRepository
      .findOne({ where: { id: payment.bookingId } })
      .then((booking) => {
        if (!booking?.guestInfo?.email) return;
        this.emailService
          .sendPaymentFailedEmail(booking.guestInfo.email, booking.guestInfo.name, {
            paymentReference: payment.providerReference ?? payment.id,
            amountNaira: (payment.amount / 100).toFixed(2),
          })
          .catch(() => void 0);
      })
      .catch(() => void 0);
  }

  private notifyPaymentSuccess(payment: Payment): void {
    if (!payment.userId) return;

    this.notificationsService
      .create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `Your payment of NGN ${(payment.amount / 100).toFixed(2)} has been confirmed and your booking is now active.`,
        metadata: { paymentId: payment.id, bookingId: payment.bookingId },
      })
      .catch(() => void 0);
  }

  private notifyPaymentFailed(payment: Payment): void {
    if (!payment.userId) return;

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

  private async recordSorobanEscrow(
    payment: Payment,
    booking: Booking,
  ): Promise<void> {
    if (!this.sorobanEscrowProvider.isEnabled) {
      this.logger.log(
        `Soroban escrow disabled - skipping on-chain escrow for booking ${booking.id}`,
      );
      return;
    }

    try {
      const beneficiary = this.sorobanEscrowProvider.beneficiary;
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
      this.logger.error(
        `Failed to record Soroban escrow for booking ${booking.id}: ${(err as Error).message}`,
      );
    }
  }
}
