import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceTrackerController } from './device-tracker.controller';
import { DeviceTracker } from './entities/device-tracker.entity';
import { DeviceRiskAssessmentService } from './services/device-risk-assessment.service';
import { DeviceSessionService } from './services/device-session.service';
import { GeolocationService } from './services/geolocation.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';
import { DeviceNotificationService } from './services/device-notification.service';
import { DeviceAuditService } from './services/device-audit.service';
import { DeviceTrackingMiddleware } from './middleware/device-tracking.middleware';
import { DeviceSecurityGuard } from './guards/device-security.guard';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceTracker])],
  controllers: [DeviceTrackerController],
  providers: [
    DeviceTrackerService,
    DeviceRiskAssessmentService,
    DeviceSessionService,
    GeolocationService,
    DeviceAnomalyDetectionService,
    DeviceNotificationService,
    DeviceAuditService,
    DeviceTrackingMiddleware,
    DeviceSecurityGuard,
  ],
  exports: [
    DeviceTrackerService,
    DeviceRiskAssessmentService,
    DeviceSessionService,
    GeolocationService,
    DeviceAnomalyDetectionService,
    DeviceNotificationService,
    DeviceAuditService,
    DeviceTrackingMiddleware,
    DeviceSecurityGuard,
  ],
})
export class DeviceTrackerModule {}
