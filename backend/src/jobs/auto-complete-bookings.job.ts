import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { CompleteBookingProvider } from '../bookings/providers/complete-booking.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class AutoCompleteBookingsJob {
  private readonly logger = new Logger(AutoCompleteBookingsJob.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly completeBookingProvider: CompleteBookingProvider,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs daily at 01:00 UTC.
   * Finds all CONFIRMED bookings whose endDate has passed and marks them
   * COMPLETED by delegating to CompleteBookingProvider — no logic duplication.
   */
  @Cron('0 1 * * *')
  async completeExpiredBookings(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const expiredBookings = await this.bookingsRepository.find({
      where: {
        status: BookingStatus.CONFIRMED,
        endDate: LessThan(today) as any,
      },
    });

    if (expiredBookings.length === 0) {
      this.logger.log('AutoCompleteBookingsJob: no expired bookings found');
      return;
    }

    this.logger.log(
      `AutoCompleteBookingsJob: found ${expiredBookings.length} expired booking(s) to complete`,
    );

    let completed = 0;

    for (const booking of expiredBookings) {
      try {
        // Reuse the existing provider — no logic duplication
        await this.completeBookingProvider.complete(booking.id);

        // Send booking_completed notification to the booking owner
        if (booking.userId) {
          await this.notificationsService.create({
            userId: booking.userId,
            type: NotificationType.BOOKING_COMPLETED,
            title: 'Booking completed',
            message: `Your booking (${booking.id}) has been automatically completed as the end date has passed.`,
            metadata: {
              bookingId: booking.id,
              workspaceId: booking.workspaceId,
              endDate: booking.endDate,
            },
          });
        }

        completed++;
      } catch (err) {
        this.logger.error(
          `AutoCompleteBookingsJob: failed to complete booking ${booking.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `AutoCompleteBookingsJob: completed ${completed}/${expiredBookings.length} booking(s)`,
    );
  }
}