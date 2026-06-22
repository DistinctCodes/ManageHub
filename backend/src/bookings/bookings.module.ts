import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { RecurringRule } from './entities/recurring-rule.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CreateBookingProvider } from './providers/create-booking.provider';
import { ConfirmBookingProvider } from './providers/confirm-booking.provider';
import { CancelBookingProvider } from './providers/cancel-booking.provider';
import { CancelRecurringBookingProvider } from './providers/cancel-recurring-booking.provider';
import { CompleteBookingProvider } from './providers/complete-booking.provider';
import { FindBookingsProvider } from './providers/find-bookings.provider';
import { CreateRecurringBookingProvider } from './providers/create-recurring-booking.provider';
import { PricingService } from './pricing/pricing.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { User } from '../users/entities/user.entity';
import { WaitlistModule } from '../sandbox/waitlist/waitlist.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, RecurringRule, User]),
    WorkspacesModule,
    WaitlistModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    PricingService,
    CreateBookingProvider,
    ConfirmBookingProvider,
    CancelBookingProvider,
    CancelRecurringBookingProvider,
    CompleteBookingProvider,
    FindBookingsProvider,
    CreateRecurringBookingProvider,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
