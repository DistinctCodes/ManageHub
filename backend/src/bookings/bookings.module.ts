import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Booking } from './entities/booking.entity';
import { RecurringRule } from './entities/recurring-rule.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CreateBookingProvider } from './providers/create-booking.provider';
import { CreatePublicDayPassProvider } from './providers/create-public-day-pass.provider';
import { ConfirmBookingProvider } from './providers/confirm-booking.provider';
import { CancelBookingProvider } from './providers/cancel-booking.provider';
import { CancelRecurringBookingProvider } from './providers/cancel-recurring-booking.provider';
import { CompleteBookingProvider } from './providers/complete-booking.provider';
import { FindBookingsProvider } from './providers/find-bookings.provider';
import { CreateRecurringBookingProvider } from './providers/create-recurring-booking.provider';
import { CalendarExportProvider } from './providers/calendar-export.provider';
import { PricingService } from './pricing/pricing.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { User } from '../users/entities/user.entity';
import { UserCredit } from '../credits/entities/user-credit.entity';
import { UserCreditTransaction } from '../credits/entities/credit-transaction.entity';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { Payment } from '../payments/entities/payment.entity';
import { PaystackProvider } from '../payments/providers/paystack.provider';


@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, User, Payment, UserCredit, UserCreditTransaction]),
    WorkspacesModule,
    WaitlistModule,
    ConfigModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    PricingService,
    CreateBookingProvider,
    CreatePublicDayPassProvider,
    ConfirmBookingProvider,
    CancelBookingProvider,
    CancelRecurringBookingProvider,
    CompleteBookingProvider,
    FindBookingsProvider,
    CreateRecurringBookingProvider,
    CalendarExportProvider,
    PaystackProvider,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}