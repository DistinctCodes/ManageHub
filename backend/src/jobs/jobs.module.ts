import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutoCompleteBookingsJob } from './auto-complete-bookings.job';
import { ExpirePendingBookingsProvider } from './providers/expire-pending-bookings.provider';

/**
 * Shared background-jobs module.
 *
 * Register all scheduled jobs here. Each job is an @Injectable() that
 * uses @Cron() decorators from @nestjs/schedule — no additional setup
 * required beyond importing this module in AppModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, WorkspaceLog]),
    BookingsModule,
    NotificationsModule,
  ],
  providers: [AutoCompleteBookingsJob, ExpirePendingBookingsProvider],
})
export class JobsModule {}
