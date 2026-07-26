import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { StaleCheckinJob } from './stale-checkin.job';
import { AutoCompleteBookingsJob } from './auto-complete-bookings.job';
import { ExpirePendingBookingsProvider } from './providers/expire-pending-bookings.provider';
import { ReconcilePendingPaymentsProvider } from './providers/reconcile-pending-payments.provider';
import { JobsObservabilityService } from './jobs-observability.service';
import { JobsObservabilityController } from './jobs-observability.controller';

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
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'bookings' },
      { name: 'notifications' },
    ),
    BookingsModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [JobsObservabilityController],
  providers: [
    StaleCheckinJob,
    AutoCompleteBookingsJob,
    ExpirePendingBookingsProvider,
    ReconcilePendingPaymentsProvider,
    JobsObservabilityService,
  ],
})
export class JobsModule {}
