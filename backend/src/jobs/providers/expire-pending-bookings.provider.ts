import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { EmailService } from '../../email/email.service';

const DEFAULT_TTL_MINUTES = 120;

/**
 * Automatically cancels PENDING bookings whose payment window has expired,
 * so their seats are released back to the availability pool.
 *
 * A booking is left alone if a PENDING payment attempt was created for it
 * within the TTL window, since the user may still be mid-checkout.
 */
@Injectable()
export class ExpirePendingBookingsProvider {
  private readonly logger = new Logger(ExpirePendingBookingsProvider.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpirePendingBookings(): Promise<void> {
    const ttlMinutes = this.getTtlMinutes();
    const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

    const candidates = await this.findExpiredBookings(cutoff);
    let expiredCount = 0;

    for (const booking of candidates) {
      try {
        await this.expireBooking(booking);
        expiredCount += 1;
      } catch (error) {
        this.logger.error(
          `Failed to expire booking "${booking.id}": ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Booking expiry run complete: ${expiredCount}/${candidates.length} PENDING booking(s) past the ${ttlMinutes}m TTL were cancelled.`,
    );
  }

  private getTtlMinutes(): number {
    const raw = this.configService.get<string>('BOOKING_PAYMENT_TTL_MINUTES');
    const parsed = parseInt(raw ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES;
  }

  private async findExpiredBookings(cutoff: Date): Promise<Booking[]> {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.workspace', 'workspace')
      .where('booking.status = :status', { status: BookingStatus.PENDING })
      .andWhere('booking.createdAt < :cutoff', { cutoff })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Payment, 'payment')
          .where('payment.bookingId = booking.id')
          .andWhere('payment.status = :paymentStatus')
          .andWhere('payment.createdAt >= :cutoff')
          .getQuery();
        return `NOT EXISTS (${subQuery})`;
      })
      .setParameter('paymentStatus', PaymentStatus.PENDING)
      .getMany();
  }

  private async expireBooking(booking: Booking): Promise<void> {
    booking.status = BookingStatus.CANCELLED;
    await this.bookingsRepository.save(booking);

    if (!booking.userId || !booking.user) {
      return;
    }

    const workspaceName = booking.workspace?.name ?? 'the requested workspace';

    await this.notificationsService.create({
      userId: booking.userId,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking Expired',
      message: `Your booking for ${workspaceName} was cancelled because payment was not completed in time.`,
      metadata: { bookingId: booking.id, reason: 'payment_ttl_expired' },
    });

    try {
      await this.emailService.sendBookingCancelledEmail(
        booking.user.email,
        booking.user.fullName,
        {
          bookingId: booking.id,
          workspaceName,
          startDate: booking.startDate,
          endDate: booking.endDate,
          cancelledBy: 'System (payment not received in time)',
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send cancellation email for booking "${booking.id}": ${(error as Error).message}`,
      );
    }
  }
}
