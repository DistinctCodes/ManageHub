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
    private readonly paystackProvider: PaystackProvider,
    private readonly sorobanEscrowProvider: SorobanEscrowProvider,
    private readonly bookingsService: BookingsService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

    // Confirm the booking
    const booking = await this.bookingsService.confirm(payment.bookingId);

    // For long-term bookings, record on-chain escrow
    if (LONG_TERM_PLANS.has(booking.planType)) {
      await this.recordSorobanEscrow(payment, booking);
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
        if (!user) return;
        this.bookingsRepository
          .findOne({ where: { id: payment.bookingId } })
          .then((bk) => {
            this.emailService
              .sendPaymentSuccessEmail(user.email, user.fullName, {
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

    // Notify user
    this.notificationsService
      .create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `Your payment of ₦${(payment.amount / 100).toFixed(2)} has been confirmed and your booking is now active.`,
        metadata: { paymentId: payment.id, bookingId: payment.bookingId },
      })
      .catch(() => void 0);

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

    // Send payment failed email
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

    this.notificationsService
      .create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
        metadata: { paymentId: payment.id, bookingId: payment.bookingId },
      })
      .catch(() => void 0);

    this.logger.log(`charge.failed: payment ${payment.id} marked FAILED`);
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
