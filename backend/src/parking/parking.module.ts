import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSlot } from './entities/parking-slot.entity';
import { ParkingBooking } from './entities/parking-booking.entity';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';

@Module({
  imports: [
    // Standalone SQLite connection for parking system
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'parking.db',
      entities: [ParkingSlot, ParkingBooking],
      synchronize: true,
      name: 'parking',
    }),
    TypeOrmModule.forFeature([ParkingSlot, ParkingBooking], 'parking'),
  ],
  controllers: [ParkingController],
  providers: [ParkingService],
})
export class ParkingModule {}
