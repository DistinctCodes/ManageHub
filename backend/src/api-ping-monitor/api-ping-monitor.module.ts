import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiEndpoint } from './entities/api-endpoint.entity';
import { PingResult } from './entities/ping-result.entity';
import { ApiPingMonitorController } from './api-ping-monitor.controller';
import { ApiEndpointService } from './services/api-endpoint.service';
import { ApiMonitorService } from './services/api-monitor.service';
import { ApiNotificationService } from './services/api-notification.service';
import { ApiAnalyticsService } from './services/api-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiEndpoint, PingResult]),
    ScheduleModule.forRoot(), // Enable scheduled tasks
  ],
  controllers: [ApiPingMonitorController],
  providers: [
    ApiEndpointService,
    ApiMonitorService,
    ApiNotificationService,
    ApiAnalyticsService,
  ],
  exports: [
    ApiEndpointService,
    ApiMonitorService,
    ApiNotificationService,
    ApiAnalyticsService,
  ],
})
export class ApiPingMonitorModule {}
