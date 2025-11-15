import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

// --- Adjust paths to your actual entities ---
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

// import { AuthModule } from '../auth/auth.module'; // <-- Import for guards

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, Attendance]),
    // AuthModule, // <-- Add for security
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}