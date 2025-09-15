import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { DeviceTrackerService } from '../device-tracker.service';
import { RiskLevel, DeviceStatus } from '../entities/device-tracker.entity';

@Injectable()
export class DeviceSecurityGuard implements CanActivate {
  private readonly logger = new Logger(DeviceSecurityGuard.name);

  constructor(private readonly deviceTrackerService: DeviceTrackerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const deviceContext = request.deviceContext;

    if (!deviceContext) {
      this.logger.warn('No device context found - allowing request with warning');
      return true;
    }

    // Block high-risk devices
    if (deviceContext.riskLevel === RiskLevel.CRITICAL) {
      this.logger.error(`Blocking critical risk device: ${deviceContext.deviceId}`);
      throw new ForbiddenException('Device blocked due to critical security risk');
    }

    // Block if device is explicitly blocked
    if (deviceContext.deviceId) {
      try {
        const device = await this.deviceTrackerService.findOne(deviceContext.deviceId);
        if (device.status === DeviceStatus.BLOCKED) {
          this.logger.error(`Blocking explicitly blocked device: ${deviceContext.deviceId}`);
          throw new ForbiddenException('Device has been blocked by administrator');
        }
      } catch (error) {
        // If device not found, log but allow (might be new device)
        this.logger.warn(`Device ${deviceContext.deviceId} not found in database`);
      }
    }

    // Log high-risk access attempts
    if (deviceContext.riskScore > 70) {
      this.logger.warn(
        `High-risk device access attempt: ` +
        `Device ID: ${deviceContext.deviceId}, ` +
        `Risk Score: ${deviceContext.riskScore}, ` +
        `Risk Level: ${deviceContext.riskLevel}`,
      );
    }

    return true;
  }
}