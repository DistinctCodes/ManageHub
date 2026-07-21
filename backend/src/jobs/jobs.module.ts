import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpirePendingBookingsProvider } from './providers/expire-pending-bookings.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Payment]), NotificationsModule],
  providers: [ExpirePendingBookingsProvider],
})
export class JobsModule {}
