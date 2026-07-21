import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutoCompleteBookingsJob } from './auto-complete-bookings.job';

/**
 * Shared background-jobs module (BE-03).
 *
 * Register all scheduled jobs here. Each job is an @Injectable() that
 * uses @Cron() decorators from @nestjs/schedule — no additional setup
 * required beyond importing this module in AppModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, WorkspaceLog]),
    BookingsModule,
    NotificationsModule,
  ],
  providers: [AutoCompleteBookingsJob],
})
export class JobsModule {}