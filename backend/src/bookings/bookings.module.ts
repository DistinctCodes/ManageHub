import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CreateBookingProvider } from './providers/create-booking.provider';
import { CreatePublicDayPassProvider } from './providers/create-public-day-pass.provider';
import { ConfirmBookingProvider } from './providers/confirm-booking.provider';
import { CancelBookingProvider } from './providers/cancel-booking.provider';
import { CompleteBookingProvider } from './providers/complete-booking.provider';
import { FindBookingsProvider } from './providers/find-bookings.provider';
import { PricingService } from './pricing/pricing.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaystackProvider } from '../payments/providers/paystack.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, User, Payment]),
    WorkspacesModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    PricingService,
    CreateBookingProvider,
    CreatePublicDayPassProvider,
    ConfirmBookingProvider,
    CancelBookingProvider,
    CompleteBookingProvider,
    FindBookingsProvider,
    PaystackProvider,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
