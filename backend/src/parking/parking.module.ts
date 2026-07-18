import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParkingSpot]),
    NotificationsModule,
  ],
  controllers: [ParkingController],
  providers: [ParkingService],
  exports: [ParkingService],
})
export class ParkingModule {}