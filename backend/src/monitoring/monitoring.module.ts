import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [TypeOrmModule.forRoot()],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
