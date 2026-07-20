import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { UserRole } from '../../users/enums/userRoles.enum';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { PaymentProvider } from '../../payments/enums/payment-provider.enum';
import { RefundPaymentProvider } from '../../payments/providers/refund-payment.provider';

const DEFAULT_REFUND_WINDOW_HOURS = 24;

export interface CancelBookingRefundOutcome {
  attempted: boolean;
  refunded: boolean;
  reason: string;
}

export interface CancelBookingResult {
  booking: Booking;
  refund: CancelBookingRefundOutcome;
}

@Injectable()
export class CancelBookingProvider {
  private readonly logger = new Logger(CancelBookingProvider.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly emailService: EmailService,
    private readonly workspacesService: WorkspacesService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RefundPaymentProvider))
    private readonly refundPaymentProvider: RefundPaymentProvider,
  ) {}

  async cancel(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CancelBookingResult> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    const isAdmin =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.STAFF;

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED bookings can be cancelled',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    const saved = await this.bookingsRepository.save(booking);

    const refund = await this.applyRefundPolicy(saved);

    // Fire-and-forget cancellation email
    Promise.all([
      this.usersRepository.findOne({ where: { id: saved.userId } }),
      this.workspacesService.findById(saved.workspaceId),
    ])
      .then(([user, workspace]) => {
        if (!user || !workspace) return;
        const cancelledBy =
          saved.userId === userId ? user.fullName : 'Administrator';
        this.emailService
          .sendBookingCancelledEmail(user.email, user.fullName, {
            bookingId: saved.id,
            workspaceName: workspace.name,
            startDate: saved.startDate,
            endDate: saved.endDate,
            cancelledBy,
            refundNote: refund.attempted ? refund.reason : undefined,
          })
          .catch(() => void 0);
      })
      .catch(() => void 0);

    return { booking: saved, refund };
  }

  /**
   * Refund policy: a booking with a SUCCESS Paystack payment is refunded
   * automatically if it's cancelled at least CANCELLATION_REFUND_WINDOW_HOURS
   * before its startDate; otherwise it's cancelled without a refund. Bookings
   * with no successful payment, or ones paid via the Soroban escrow path
   * (handled separately on-chain), are left untouched here.
   */
  private async applyRefundPolicy(
    booking: Booking,
  ): Promise<CancelBookingRefundOutcome> {
    const payment = await this.paymentsRepository.findOne({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.SUCCESS,
        provider: PaymentProvider.PAYSTACK,
      },
    });

    if (!payment) {
      return {
        attempted: false,
        refunded: false,
        reason: 'No successful Paystack payment associated with this booking',
      };
    }

    const windowHours = this.getRefundWindowHours();
    const hoursUntilStart =
      (new Date(booking.startDate).getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilStart < windowHours) {
      return {
        attempted: true,
        refunded: false,
        reason: `Cancelled within the ${windowHours}-hour refund window, so no refund was issued`,
      };
    }

    try {
      await this.refundPaymentProvider.refundCore(payment);
      return {
        attempted: true,
        refunded: true,
        reason: `Cancelled ${Math.floor(hoursUntilStart)}h before start (>= ${windowHours}h policy) — refunded automatically`,
      };
    } catch (error) {
      this.logger.error(
        `Auto-refund failed for booking ${booking.id}: ${(error as Error).message}`,
      );
      return {
        attempted: true,
        refunded: false,
        reason: 'Automatic refund could not be processed — contact support',
      };
    }
  }

  private getRefundWindowHours(): number {
    const raw = this.configService.get<string>(
      'CANCELLATION_REFUND_WINDOW_HOURS',
    );
    const parsed = parseInt(raw ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_REFUND_WINDOW_HOURS;
  }
}
