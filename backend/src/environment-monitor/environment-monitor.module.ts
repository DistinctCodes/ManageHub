import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EnvironmentMonitorService } from './environment-monitor.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EnvironmentMonitorService],
})
export class EnvironmentMonitorModule {}
