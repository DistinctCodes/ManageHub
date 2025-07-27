import { Module } from '@nestjs/common';
import { DeviceMaintenanceService } from './device-maintenance.service';
import { DeviceMaintenanceController } from './device-maintenance.controller';

@Module({
  controllers: [DeviceMaintenanceController],
  providers: [DeviceMaintenanceService],
})
export class DeviceMaintenanceModule {}
