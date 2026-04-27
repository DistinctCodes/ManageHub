import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// Runs every hour; cancels bookings stuck in `pending` for > 24 h without payment.
@Injectable()
export class StaleBookingJob {
  private readonly logger = new Logger(StaleBookingJob.name);

  constructor(
    private readonly bookingRepo: any,
    private readonly mailer: any,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelStaleBookings() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stale = await this.bookingRepo.find({
      where: { status: 'pending' },
      relations: ['user'],
    });

    const toCancel = stale.filter((b: any) => new Date(b.createdAt) < cutoff);
    if (!toCancel.length) {
      this.logger.log('No stale bookings found');
      return;
    }

    await this.bookingRepo.update(
      toCancel.map((b: any) => b.id),
      { status: 'cancelled' },
    );

    for (const booking of toCancel) {
      await this.mailer.sendMail({
        to: booking.user.email,
        subject: 'Your booking was cancelled',
        text: `Booking ${booking.id} was automatically cancelled due to no payment within 24 hours.`,
      });
    }

    this.logger.log(`Cancelled ${toCancel.length} stale pending booking(s)`);
  }
}
