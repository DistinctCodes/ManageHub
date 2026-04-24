import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { SandboxBookingsController } from './bookings.controller';
import { BulkCancelProvider } from './providers/bulk-cancel.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  controllers: [SandboxBookingsController],
  providers: [BulkCancelProvider],
})
export class SandboxBookingsModule {}
