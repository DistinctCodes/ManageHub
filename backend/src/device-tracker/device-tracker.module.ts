import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceTrackerController } from './device-tracker.controller';
import { DeviceTracker } from './entities/device-tracker.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceTracker])],
  controllers: [DeviceTrackerController],
  providers: [DeviceTrackerService],
  exports: [DeviceTrackerService],
})
export class DeviceTrackerModule {}