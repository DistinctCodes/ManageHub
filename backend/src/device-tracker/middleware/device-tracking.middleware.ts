import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DeviceTrackerService } from '../device-tracker.service';
import { DeviceSessionService } from '../services/device-session.service';
import { DeviceRiskAssessmentService } from '../services/device-risk-assessment.service';
import { GeolocationService } from '../services/geolocation.service';
import {
  DeviceType,
  DeviceStatus,
  RiskLevel,
} from '../entities/device-tracker.entity';

export interface DeviceContext {
  deviceId?: string;
  sessionToken?: string;
  isNewDevice: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  shouldBlock: boolean;
  geolocation?: any;
}

declare global {
  namespace Express {
    interface Request {
      deviceContext?: DeviceContext;
    }
  }
}

@Injectable()
export class DeviceTrackingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DeviceTrackingMiddleware.name);

  constructor(
    private readonly deviceTrackerService: DeviceTrackerService,
    private readonly sessionService: DeviceSessionService,
    private readonly riskAssessmentService: DeviceRiskAssessmentService,
    private readonly geolocationService: GeolocationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceContext = await this.processDeviceTracking(req);
      req.deviceContext = deviceContext;

      // Check if device should be blocked
      if (deviceContext.shouldBlock) {
        this.logger.warn(
          `Blocking request from device ${deviceContext.deviceId} due to high risk score: ${deviceContext.riskScore}`,
        );
        throw new ForbiddenException(
          'Device access blocked due to security concerns',
        );
      }

      // Log the request for audit purposes
      this.logDeviceActivity(req, deviceContext);

      next();
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error('Error in device tracking middleware:', error);
      // Continue with limited device context on error
      req.deviceContext = {
        isNewDevice: true,
        riskScore: 50, // Medium risk when unknown
        riskLevel: RiskLevel.MEDIUM,
        shouldBlock: false,
      };
      next();
    }
  }

  private async processDeviceTracking(req: Request): Promise<DeviceContext> {
    const ipAddress = this.extractIPAddress(req);
    const userAgent = req.headers['user-agent'] || '';
    const sessionToken = this.extractSessionToken(req);
    const userId = this.extractUserId(req);

    // Generate device fingerprint
    const deviceFingerprint = this.generateDeviceFingerprint(req);

    // Check for existing device
    let existingDevice = await this.findExistingDevice(
      deviceFingerprint,
      ipAddress,
      userId,
    );
    let isNewDevice = !existingDevice;

    // Analyze IP and get geolocation
    const ipAnalysis = await this.geolocationService.analyzeIP(ipAddress);

    // Get existing devices for risk assessment
    const existingDevices = userId
      ? await this.deviceTrackerService.findByUserId(userId)
      : await this.deviceTrackerService.findByIpAddress(ipAddress);

    // Create or update device entry
    let deviceId: string;
    if (existingDevice) {
      // Update existing device
      const updatedDevice =
        await this.geolocationService.updateDeviceGeolocation({
          ...existingDevice,
          lastSeenAt: new Date(),
          userAgent,
        });

      await this.deviceTrackerService.update(existingDevice.id, updatedDevice);
      deviceId = existingDevice.id;
    } else {
      // Create new device entry
      const deviceType = this.detectDeviceType(userAgent);
      const newDeviceData =
        await this.geolocationService.updateDeviceGeolocation({
          userId,
          deviceType,
          ipAddress,
          userAgent,
          deviceFingerprint,
          location: `${ipAnalysis.geolocation.city}, ${ipAnalysis.geolocation.countryName}`,
        });

      const newDevice = await this.deviceTrackerService.create(
        newDeviceData as any,
      );
      deviceId = newDevice.id;
      existingDevice = newDevice;
    }

    // Perform risk assessment
    const securityFlags = this.riskAssessmentService.assessSecurityFlags(
      existingDevice,
      existingDevices,
    );

    const riskAssessment = this.riskAssessmentService.calculateRiskScore(
      existingDevice,
      securityFlags,
      existingDevices,
    );

    // Update device with risk score
    if (
      existingDevice.riskScore !== riskAssessment.riskScore ||
      existingDevice.riskLevel !== riskAssessment.riskLevel
    ) {
      await this.deviceTrackerService.update(deviceId, {
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel,
        status: riskAssessment.shouldBlock
          ? DeviceStatus.BLOCKED
          : DeviceStatus.ACTIVE,
      });
    }

    // Create or update session if session token provided
    let currentSessionToken = sessionToken;
    if (sessionToken) {
      const isValidSession =
        await this.sessionService.validateSession(sessionToken);
      if (isValidSession) {
        await this.sessionService.updateSessionActivity(sessionToken);
      } else {
        currentSessionToken = undefined;
      }
    }

    return {
      deviceId,
      sessionToken: currentSessionToken,
      isNewDevice,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
      shouldBlock: riskAssessment.shouldBlock,
      geolocation: ipAnalysis.geolocation,
    };
  }

  private extractIPAddress(req: Request): string {
    // Handle various proxy headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-client-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1'
    );
  }

  private extractSessionToken(req: Request): string | undefined {
    // Check various places for session token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const sessionCookie = req.cookies?.['device-session'];
    if (sessionCookie) {
      return sessionCookie;
    }

    // Check query parameter
    const sessionParam = req.query?.['session'] as string;
    if (sessionParam) {
      return sessionParam;
    }

    return undefined;
  }

  private extractUserId(req: Request): string | undefined {
    // This would typically come from JWT token or session
    // For now, we'll check various sources

    // Check if user is attached to request (from auth middleware)
    const user = (req as any).user;
    if (user && user.id) {
      return user.id;
    }

    // Check custom header
    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader) {
      return userIdHeader;
    }

    return undefined;
  }

  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const accept = req.headers['accept'] || '';

    // Create a simple fingerprint based on headers
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${accept}`;

    // In a real implementation, you might use a crypto hash
    return Buffer.from(fingerprint).toString('base64');
  }

  private async findExistingDevice(
    fingerprint: string,
    ipAddress: string,
    userId?: string,
  ): Promise<any> {
    // Try to find by fingerprint first
    const devices = await this.deviceTrackerService.findAll({
      limit: '100',
      offset: '0',
    });

    // Find by fingerprint
    let device = devices.data.find((d) => d.deviceFingerprint === fingerprint);

    if (!device && userId) {
      // Find by user ID and similar characteristics
      const userDevices = await this.deviceTrackerService.findByUserId(userId);
      device = userDevices.find((d) => d.ipAddress === ipAddress);
    }

    return device;
  }

  private detectDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return DeviceType.MOBILE;
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.TABLET;
    }

    if (
      ua.includes('windows') ||
      ua.includes('macintosh') ||
      ua.includes('linux')
    ) {
      if (ua.includes('laptop') || ua.includes('mobile')) {
        return DeviceType.LAPTOP;
      }
      return DeviceType.DESKTOP;
    }

    return DeviceType.UNKNOWN;
  }

  private logDeviceActivity(req: Request, context: DeviceContext): void {
    const logData = {
      timestamp: new Date().toISOString(),
      deviceId: context.deviceId,
      sessionToken: context.sessionToken ? '***' : undefined,
      isNewDevice: context.isNewDevice,
      riskScore: context.riskScore,
      riskLevel: context.riskLevel,
      ipAddress: this.extractIPAddress(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      country: context.geolocation?.countryCode,
      city: context.geolocation?.city,
    };

    if (context.riskScore > 50) {
      this.logger.warn('High-risk device activity:', logData);
    } else {
      this.logger.log('Device activity:', logData);
    }
  }
}
