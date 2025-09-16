import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DeviceTracker,
  RiskLevel,
  DeviceStatus,
} from '../entities/device-tracker.entity';
import { GeolocationService } from './geolocation.service';

export interface AnomalyDetectionResult {
  deviceId: string;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  riskScore: number;
  recommendations: string[];
  detectedAt: Date;
  evidence: Record<string, any>;
}

export enum AnomalyType {
  IMPOSSIBLE_TRAVEL = 'impossible_travel',
  SUSPICIOUS_LOCATION = 'suspicious_location',
  UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  RAPID_DEVICE_SWITCHING = 'rapid_device_switching',
  CONCURRENT_SESSIONS = 'concurrent_sessions',
  VELOCITY_ABUSE = 'velocity_abuse',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  SECURITY_THREAT = 'security_threat',
}

export interface AnomalyRule {
  id: string;
  type: AnomalyType;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: Record<string, number>;
  enabled: boolean;
  action: 'log' | 'flag' | 'block' | 'notify';
}

@Injectable()
export class DeviceAnomalyDetectionService {
  private readonly logger = new Logger(DeviceAnomalyDetectionService.name);
  private readonly anomalies: Map<string, AnomalyDetectionResult[]> = new Map();

  private readonly defaultRules: AnomalyRule[] = [
    {
      id: 'impossible-travel',
      type: AnomalyType.IMPOSSIBLE_TRAVEL,
      name: 'Impossible Travel Detection',
      description: 'Detect physically impossible travel between locations',
      severity: 'critical',
      threshold: { maxSpeedKmh: 1000, timeWindowHours: 2 },
      enabled: true,
      action: 'block',
    },
    {
      id: 'suspicious-location',
      type: AnomalyType.SUSPICIOUS_LOCATION,
      name: 'Suspicious Location Access',
      description: 'Access from high-risk countries or VPN/Tor networks',
      severity: 'high',
      threshold: { riskCountries: 1, vpnTorUsage: 1 },
      enabled: true,
      action: 'flag',
    },
    {
      id: 'failed-attempts',
      type: AnomalyType.MULTIPLE_FAILED_ATTEMPTS,
      name: 'Multiple Failed Attempts',
      description: 'Multiple failed login attempts from same device',
      severity: 'medium',
      threshold: { maxFailedAttempts: 5, timeWindowMinutes: 15 },
      enabled: true,
      action: 'flag',
    },
    {
      id: 'rapid-switching',
      type: AnomalyType.RAPID_DEVICE_SWITCHING,
      name: 'Rapid Device Switching',
      description: 'User switching between devices rapidly',
      severity: 'medium',
      threshold: { maxDeviceSwitches: 5, timeWindowHours: 1 },
      enabled: true,
      action: 'notify',
    },
    {
      id: 'concurrent-sessions',
      type: AnomalyType.CONCURRENT_SESSIONS,
      name: 'Concurrent Sessions',
      description: 'Multiple active sessions from different locations',
      severity: 'high',
      threshold: { maxConcurrentSessions: 3, minDistanceKm: 100 },
      enabled: true,
      action: 'flag',
    },
    {
      id: 'velocity-abuse',
      type: AnomalyType.VELOCITY_ABUSE,
      name: 'Velocity Abuse',
      description: 'Excessive API calls or rapid requests',
      severity: 'medium',
      threshold: { maxRequestsPerMinute: 100, timeWindowMinutes: 5 },
      enabled: true,
      action: 'flag',
    },
  ];

  constructor(
    @InjectRepository(DeviceTracker)
    private deviceTrackerRepository: Repository<DeviceTracker>,
    private geolocationService: GeolocationService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runAnomalyDetection(): Promise<void> {
    this.logger.log('Starting scheduled anomaly detection scan');

    try {
      // Get recent device activities (last 24 hours)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const recentDevices = await this.deviceTrackerRepository.find({
        where: {
          lastSeenAt: MoreThan(yesterday),
        },
        order: { lastSeenAt: 'DESC' },
      });

      const anomalies: AnomalyDetectionResult[] = [];

      // Group devices by user
      const devicesByUser = new Map<string, DeviceTracker[]>();
      recentDevices.forEach((device) => {
        if (device.userId) {
          if (!devicesByUser.has(device.userId)) {
            devicesByUser.set(device.userId, []);
          }
          devicesByUser.get(device.userId)!.push(device);
        }
      });

      // Run detection rules for each user's devices
      for (const [userId, userDevices] of devicesByUser) {
        const userAnomalies = await this.detectUserAnomalies(
          userId,
          userDevices,
        );
        anomalies.push(...userAnomalies);
      }

      // Run global detection rules
      const globalAnomalies = await this.detectGlobalAnomalies(recentDevices);
      anomalies.push(...globalAnomalies);

      // Process detected anomalies
      await this.processAnomalies(anomalies);

      this.logger.log(
        `Anomaly detection completed. Found ${anomalies.length} anomalies.`,
      );
    } catch (error) {
      this.logger.error('Error during anomaly detection:', error);
    }
  }

  async detectUserAnomalies(
    userId: string,
    userDevices: DeviceTracker[],
  ): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    // Sort devices by last seen time
    const sortedDevices = userDevices.sort(
      (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
    );

    // Check for impossible travel
    const travelAnomalies = await this.checkImpossibleTravel(sortedDevices);
    anomalies.push(...travelAnomalies);

    // Check for rapid device switching
    const switchingAnomalies = this.checkRapidDeviceSwitching(sortedDevices);
    anomalies.push(...switchingAnomalies);

    // Check for concurrent sessions from different locations
    const concurrentAnomalies = this.checkConcurrentSessions(sortedDevices);
    anomalies.push(...concurrentAnomalies);

    return anomalies;
  }

  async detectGlobalAnomalies(
    devices: DeviceTracker[],
  ): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    // Check for suspicious locations
    const locationAnomalies = this.checkSuspiciousLocations(devices);
    anomalies.push(...locationAnomalies);

    // Check for multiple failed attempts
    const failedAttemptsAnomalies = this.checkMultipleFailedAttempts(devices);
    anomalies.push(...failedAttemptsAnomalies);

    return anomalies;
  }

  private async checkImpossibleTravel(
    devices: DeviceTracker[],
  ): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];
    const rule = this.defaultRules.find(
      (r) => r.type === AnomalyType.IMPOSSIBLE_TRAVEL,
    );

    if (!rule || !rule.enabled) return anomalies;

    for (let i = 1; i < devices.length; i++) {
      const current = devices[i - 1];
      const previous = devices[i];

      if (
        !current.latitude ||
        !current.longitude ||
        !previous.latitude ||
        !previous.longitude
      ) {
        continue;
      }

      const isImpossible = this.geolocationService.isImpossibleTravel(
        {
          latitude: previous.latitude,
          longitude: previous.longitude,
          timestamp: previous.lastSeenAt,
        },
        {
          latitude: current.latitude,
          longitude: current.longitude,
          timestamp: current.lastSeenAt,
        },
        rule.threshold.maxSpeedKmh,
      );

      if (isImpossible) {
        const distance = this.geolocationService.calculateDistance(
          previous.latitude,
          previous.longitude,
          current.latitude,
          current.longitude,
        );

        anomalies.push({
          deviceId: current.id,
          anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL,
          severity: rule.severity as any,
          description: `Impossible travel detected: ${distance.toFixed(0)}km in ${(
            (current.lastSeenAt.getTime() - previous.lastSeenAt.getTime()) /
            (1000 * 60 * 60)
          ).toFixed(1)} hours`,
          riskScore: 90,
          recommendations: [
            'Verify user identity',
            'Check for account compromise',
            'Consider temporary account suspension',
          ],
          detectedAt: new Date(),
          evidence: {
            previousLocation: {
              latitude: previous.latitude,
              longitude: previous.longitude,
              timestamp: previous.lastSeenAt,
              city: previous.city,
              country: previous.countryName,
            },
            currentLocation: {
              latitude: current.latitude,
              longitude: current.longitude,
              timestamp: current.lastSeenAt,
              city: current.city,
              country: current.countryName,
            },
            distance,
            timeWindow:
              current.lastSeenAt.getTime() - previous.lastSeenAt.getTime(),
          },
        });
      }
    }

    return anomalies;
  }

  private checkSuspiciousLocations(
    devices: DeviceTracker[],
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const rule = this.defaultRules.find(
      (r) => r.type === AnomalyType.SUSPICIOUS_LOCATION,
    );

    if (!rule || !rule.enabled) return anomalies;

    const highRiskCountries = ['CN', 'RU', 'IR', 'KP', 'BY'];

    devices.forEach((device) => {
      let riskScore = 0;
      const riskFactors: string[] = [];

      if (
        device.countryCode &&
        highRiskCountries.includes(device.countryCode)
      ) {
        riskScore += 30;
        riskFactors.push(
          `Access from high-risk country: ${device.countryCode}`,
        );
      }

      if (device.isVpn) {
        riskScore += 20;
        riskFactors.push('VPN usage detected');
      }

      if (device.isTor) {
        riskScore += 40;
        riskFactors.push('Tor network usage detected');
      }

      if (device.isProxy) {
        riskScore += 25;
        riskFactors.push('Proxy usage detected');
      }

      if (riskScore > 30) {
        anomalies.push({
          deviceId: device.id,
          anomalyType: AnomalyType.SUSPICIOUS_LOCATION,
          severity:
            riskScore > 60 ? 'critical' : riskScore > 40 ? 'high' : 'medium',
          description: `Suspicious location access: ${riskFactors.join(', ')}`,
          riskScore,
          recommendations: [
            'Apply enhanced authentication',
            'Monitor user activity closely',
            'Consider requiring manual verification',
          ],
          detectedAt: new Date(),
          evidence: {
            location: {
              country: device.countryName,
              countryCode: device.countryCode,
              city: device.city,
              isVpn: device.isVpn,
              isTor: device.isTor,
              isProxy: device.isProxy,
            },
            riskFactors,
          },
        });
      }
    });

    return anomalies;
  }

  private checkRapidDeviceSwitching(
    devices: DeviceTracker[],
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const rule = this.defaultRules.find(
      (r) => r.type === AnomalyType.RAPID_DEVICE_SWITCHING,
    );

    if (!rule || !rule.enabled) return anomalies;

    const timeWindowMs = rule.threshold.timeWindowHours * 60 * 60 * 1000;
    const now = new Date().getTime();

    const recentDevices = devices.filter(
      (device) => now - device.lastSeenAt.getTime() <= timeWindowMs,
    );

    if (recentDevices.length > rule.threshold.maxDeviceSwitches) {
      const primaryDevice = recentDevices[0];

      anomalies.push({
        deviceId: primaryDevice.id,
        anomalyType: AnomalyType.RAPID_DEVICE_SWITCHING,
        severity: rule.severity as any,
        description: `Rapid device switching: ${recentDevices.length} devices used in ${rule.threshold.timeWindowHours} hours`,
        riskScore: Math.min(30 + recentDevices.length * 5, 80),
        recommendations: [
          'Verify user identity',
          'Check for shared account usage',
          'Monitor for unauthorized access',
        ],
        detectedAt: new Date(),
        evidence: {
          deviceCount: recentDevices.length,
          timeWindow: timeWindowMs,
          devices: recentDevices.map((d) => ({
            deviceId: d.id,
            deviceType: d.deviceType,
            lastSeen: d.lastSeenAt,
            ipAddress: d.ipAddress,
          })),
        },
      });
    }

    return anomalies;
  }

  private checkConcurrentSessions(
    devices: DeviceTracker[],
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const rule = this.defaultRules.find(
      (r) => r.type === AnomalyType.CONCURRENT_SESSIONS,
    );

    if (!rule || !rule.enabled) return anomalies;

    const now = new Date();
    const activeThreshold = 30 * 60 * 1000; // 30 minutes

    const activeSessions = devices.filter(
      (device) =>
        now.getTime() - device.lastSeenAt.getTime() <= activeThreshold,
    );

    if (activeSessions.length >= rule.threshold.maxConcurrentSessions) {
      // Check if sessions are from different locations
      const locations = activeSessions
        .filter((d) => d.latitude && d.longitude)
        .map((d) => ({
          latitude: d.latitude!,
          longitude: d.longitude!,
          device: d,
        }));

      let maxDistance = 0;
      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const distance = this.geolocationService.calculateDistance(
            locations[i].latitude,
            locations[i].longitude,
            locations[j].latitude,
            locations[j].longitude,
          );
          maxDistance = Math.max(maxDistance, distance);
        }
      }

      if (maxDistance >= rule.threshold.minDistanceKm) {
        const primaryDevice = activeSessions[0];

        anomalies.push({
          deviceId: primaryDevice.id,
          anomalyType: AnomalyType.CONCURRENT_SESSIONS,
          severity: rule.severity as any,
          description: `Concurrent sessions from different locations: ${activeSessions.length} active sessions, max distance ${maxDistance.toFixed(0)}km`,
          riskScore: Math.min(40 + activeSessions.length * 10, 90),
          recommendations: [
            'Terminate suspicious sessions',
            'Require re-authentication',
            'Monitor for account takeover',
          ],
          detectedAt: new Date(),
          evidence: {
            sessionCount: activeSessions.length,
            maxDistance,
            sessions: activeSessions.map((d) => ({
              deviceId: d.id,
              location: `${d.city}, ${d.countryName}`,
              ipAddress: d.ipAddress,
              lastSeen: d.lastSeenAt,
            })),
          },
        });
      }
    }

    return anomalies;
  }

  private checkMultipleFailedAttempts(
    devices: DeviceTracker[],
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const rule = this.defaultRules.find(
      (r) => r.type === AnomalyType.MULTIPLE_FAILED_ATTEMPTS,
    );

    if (!rule || !rule.enabled) return anomalies;

    devices.forEach((device) => {
      if (device.failedAttempts >= rule.threshold.maxFailedAttempts) {
        anomalies.push({
          deviceId: device.id,
          anomalyType: AnomalyType.MULTIPLE_FAILED_ATTEMPTS,
          severity: rule.severity as any,
          description: `Multiple failed attempts: ${device.failedAttempts} failed attempts detected`,
          riskScore: Math.min(20 + device.failedAttempts * 5, 70),
          recommendations: [
            'Implement account lockout',
            'Enable CAPTCHA protection',
            'Monitor for brute force attacks',
          ],
          detectedAt: new Date(),
          evidence: {
            failedAttempts: device.failedAttempts,
            deviceInfo: {
              ipAddress: device.ipAddress,
              userAgent: device.userAgent,
              location: `${device.city}, ${device.countryName}`,
            },
          },
        });
      }
    });

    return anomalies;
  }

  private async processAnomalies(
    anomalies: AnomalyDetectionResult[],
  ): Promise<void> {
    for (const anomaly of anomalies) {
      // Store anomaly
      const deviceAnomalies = this.anomalies.get(anomaly.deviceId) || [];
      deviceAnomalies.push(anomaly);
      this.anomalies.set(anomaly.deviceId, deviceAnomalies);

      // Apply rule actions
      const rule = this.defaultRules.find(
        (r) => r.type === anomaly.anomalyType,
      );
      if (rule) {
        await this.applyRuleAction(anomaly, rule);
      }

      // Log anomaly
      this.logger.warn(
        `Anomaly detected: ${anomaly.anomalyType} - ${anomaly.description}`,
        {
          deviceId: anomaly.deviceId,
          severity: anomaly.severity,
          riskScore: anomaly.riskScore,
          evidence: anomaly.evidence,
        },
      );
    }
  }

  private async applyRuleAction(
    anomaly: AnomalyDetectionResult,
    rule: AnomalyRule,
  ): Promise<void> {
    try {
      switch (rule.action) {
        case 'block':
          await this.deviceTrackerRepository.update(
            { id: anomaly.deviceId },
            {
              status: DeviceStatus.BLOCKED,
              riskLevel: RiskLevel.CRITICAL,
              blockedAt: new Date(),
              blockedReason: `Anomaly detected: ${anomaly.description}`,
            },
          );
          break;

        case 'flag':
          await this.deviceTrackerRepository.update(
            { id: anomaly.deviceId },
            {
              status: DeviceStatus.SUSPICIOUS,
              riskLevel:
                anomaly.severity === 'critical'
                  ? RiskLevel.CRITICAL
                  : anomaly.severity === 'high'
                    ? RiskLevel.HIGH
                    : RiskLevel.MEDIUM,
              riskScore: anomaly.riskScore,
            },
          );
          break;

        case 'notify':
          // In a real implementation, you would send notifications here
          this.logger.warn(
            `Notification required for anomaly: ${anomaly.description}`,
          );
          break;

        case 'log':
        default:
          // Already logged above
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to apply rule action for anomaly ${anomaly.deviceId}:`,
        error,
      );
    }
  }

  async getDeviceAnomalies(
    deviceId: string,
  ): Promise<AnomalyDetectionResult[]> {
    return this.anomalies.get(deviceId) || [];
  }

  async getAllAnomalies(): Promise<AnomalyDetectionResult[]> {
    const allAnomalies: AnomalyDetectionResult[] = [];
    for (const deviceAnomalies of this.anomalies.values()) {
      allAnomalies.push(...deviceAnomalies);
    }
    return allAnomalies.sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
  }

  async getAnomalyStatistics(): Promise<{
    totalAnomalies: number;
    anomaliesByType: Record<string, number>;
    anomaliesBySeverity: Record<string, number>;
    recentAnomalies: AnomalyDetectionResult[];
  }> {
    const allAnomalies = await this.getAllAnomalies();

    const anomaliesByType: Record<string, number> = {};
    const anomaliesBySeverity: Record<string, number> = {};

    allAnomalies.forEach((anomaly) => {
      anomaliesByType[anomaly.anomalyType] =
        (anomaliesByType[anomaly.anomalyType] || 0) + 1;
      anomaliesBySeverity[anomaly.severity] =
        (anomaliesBySeverity[anomaly.severity] || 0) + 1;
    });

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const recentAnomalies = allAnomalies.filter(
      (anomaly) => anomaly.detectedAt > oneDayAgo,
    );

    return {
      totalAnomalies: allAnomalies.length,
      anomaliesByType,
      anomaliesBySeverity,
      recentAnomalies,
    };
  }
}
