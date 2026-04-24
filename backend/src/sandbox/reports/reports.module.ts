import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { ReportsController } from './reports.controller';
import { BookingCsvProvider } from './providers/booking-csv.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  controllers: [ReportsController],
  providers: [BookingCsvProvider],
})
export class SandboxReportsModule {}
