import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { Booking } from './entities/booking.entity';
import { ResourceBookingService } from './resource-booking.service';
import { ResourceBookingController } from './resource-booking.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, Booking])],
  providers: [ResourceBookingService],
  controllers: [ResourceBookingController],
})
export class ResourceBookingModule {}
