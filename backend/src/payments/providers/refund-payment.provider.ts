import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaystackProvider } from './paystack.provider';
import { UserRole } from '../../users/enums/userRoles.enum';
import { User } from '../../users/entities/user.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { BookingsService } from '../../bookings/bookings.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

@Injectable()
export class RefundPaymentProvider {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly paystackProvider: PaystackProvider,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookingsService: BookingsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Admin-facing entry point: refunds the payment, then cancels its linked
   * booking (reusing CancelBookingProvider via BookingsService). Cancelling
   * is skipped if the booking is already CANCELLED, so this stays idempotent
   * if called twice.
   */
  async refund(
    paymentId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<Payment> {
    const isAdmin =
      requestingUserRole === UserRole.ADMIN ||
      requestingUserRole === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only admins can refund payments. Cancel the booking instead if you are the customer.',
      );
    }

    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment "${paymentId}" not found`);
    }

    const refunded = await this.refundCore(payment);

    const booking = await this.bookingsService.findById(
      payment.bookingId,
      requestingUserId,
      requestingUserRole,
    );
    if (booking.status !== BookingStatus.CANCELLED) {
      await this.bookingsService.cancel(
        payment.bookingId,
        requestingUserId,
        requestingUserRole,
      );
    }

    return refunded;
  }

  /**
   * Refunds a SUCCESS payment via Paystack and marks it REFUNDED, without
   * touching the linked booking. Used both by the admin-facing `refund()`
   * above and by CancelBookingProvider's auto-refund policy — keeping the
   * booking mutation out of this method is what prevents cancel -> refund
   * -> cancel recursion between the two providers.
   */
  async refundCore(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        `Only SUCCESS payments can be refunded. Current status: ${payment.status}`,
      );
    }

    await this.paystackProvider.initiateRefund(payment.providerReference);

    payment.status = PaymentStatus.REFUNDED;
    const saved = await this.paymentsRepository.save(payment);

    if (payment.userId) {
      this.notificationsService
        .create({
          userId: payment.userId,
          type: NotificationType.PAYMENT_REFUNDED,
          title: 'Payment Refunded',
          message: `Your payment of ₦${(payment.amount / 100).toFixed(2)} has been refunded.`,
          metadata: { paymentId: payment.id, bookingId: payment.bookingId },
        })
        .catch(() => void 0);

      this.usersRepository
        .findOne({ where: { id: payment.userId } })
        .then((user) => {
          if (!user) return;
          this.emailService
            .sendPaymentRefundedEmail(user.email, user.fullName, {
              paymentReference: payment.providerReference ?? payment.id,
              amountNaira: (payment.amount / 100).toFixed(2),
            })
            .catch(() => void 0);
        })
        .catch(() => void 0);
    }

    return saved;
  }
}
