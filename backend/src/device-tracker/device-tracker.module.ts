import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceTrackerController } from './device-tracker.controller';
import { DeviceTracker } from './entities/device-tracker.entity';
import { DeviceRiskAssessmentService } from './services/device-risk-assessment.service';
import { DeviceSessionService } from './services/device-session.service';
import { GeolocationService } from './services/geolocation.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';
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
    DeviceTrackingMiddleware,
    DeviceSecurityGuard,
  ],
  exports: [
    DeviceTrackerService,
    DeviceRiskAssessmentService,
    DeviceSessionService,
    GeolocationService,
    DeviceAnomalyDetectionService,
    DeviceTrackingMiddleware,
    DeviceSecurityGuard,
  ],
})
export class DeviceTrackerModule {}