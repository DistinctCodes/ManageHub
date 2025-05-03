import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringLog } from './monitoring.entity';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MonitoringLog])],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
