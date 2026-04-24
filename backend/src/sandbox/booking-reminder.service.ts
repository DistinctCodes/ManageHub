import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Runs every hour. Finds confirmed bookings whose startDate falls within
   * the next 24–25 hours and sends a reminder email to each user.
   * Uses a `reminderSent` flag on the booking to avoid duplicates.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // startDate is stored as 'YYYY-MM-DD'; compare as date strings
    const startStr = windowStart.toISOString().slice(0, 10);
    const endStr = windowEnd.toISOString().slice(0, 10);

    const bookings = await this.bookingRepo.find({
      where: {
        status: BookingStatus.CONFIRMED,
        startDate: Between(startStr, endStr),
        reminderSent: false,
      },
      relations: ['user', 'workspace'],
    });

    let sent = 0;
    for (const booking of bookings) {
      if (!booking.user?.email) continue;

      const fullName =
        `${booking.user.firstname} ${booking.user.lastname}`.trim();
      await this.emailService.sendBookingCreatedEmail(
        booking.user.email,
        fullName,
        {
          bookingId: booking.id,
          workspaceName: booking.workspace?.name ?? '',
          planType: booking.planType,
          startDate: booking.startDate,
          endDate: booking.endDate,
          seatCount: booking.seatCount,
          totalAmountNaira: (Number(booking.totalAmount) / 100).toFixed(2),
        },
      );

      await this.bookingRepo.update(booking.id, { reminderSent: true });
      sent++;
    }

    this.logger.log(`Booking reminder job: ${sent} reminder(s) sent.`);
  }
}
