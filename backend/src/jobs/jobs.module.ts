import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StaleCheckinJob } from './stale-checkin.job';
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
    TypeOrmModule.forFeature([WorkspaceLog, Booking, Payment]),
    NotificationsModule,
  ],
  providers: [StaleCheckinJob, ExpirePendingBookingsProvider],
})
export class JobsModule {}
