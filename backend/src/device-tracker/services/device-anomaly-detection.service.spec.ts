import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceAnomalyDetectionService,
  AnomalyType,
  AnomalyDetectionResult,
} from './device-anomaly-detection.service';
import {
  DeviceTracker,
  DeviceType,
  DeviceStatus,
  RiskLevel,
} from '../entities/device-tracker.entity';
import { GeolocationService } from './geolocation.service';
import { Logger } from '@nestjs/common';

describe('DeviceAnomalyDetectionService', () => {
  let service: DeviceAnomalyDetectionService;
  let repository: jest.Mocked<Repository<DeviceTracker>>;
  let geolocationService: any;
  let logger: any;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockGeolocationService = {
    isImpossibleTravel: jest.fn(),
    calculateDistance: jest.fn(),
    analyzeIP: jest.fn(),
    updateDeviceGeolocation: jest.fn(),
    detectLocationAnomalies: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceAnomalyDetectionService,
        {
          provide: getRepositoryToken(DeviceTracker),
          useValue: mockRepository,
        },
        {
          provide: GeolocationService,
          useValue: mockGeolocationService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<DeviceAnomalyDetectionService>(
      DeviceAnomalyDetectionService,
    );
    repository = module.get(getRepositoryToken(DeviceTracker));
    geolocationService = module.get(GeolocationService);
    logger = module.get(Logger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runAnomalyDetection', () => {
    it('should run complete anomaly detection scan', async () => {
      const mockDevices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user-1',
          deviceType: DeviceType.DESKTOP,
          ipAddress: '192.168.1.1',
          lastSeenAt: new Date(),
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          countryName: 'United States',
          countryCode: 'US',
          isVpn: false,
          isTor: false,
          isProxy: false,
          failedAttempts: 0,
          status: DeviceStatus.ACTIVE,
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user-1',
          deviceType: DeviceType.MOBILE,
          ipAddress: '10.0.0.1',
          lastSeenAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          countryName: 'United States',
          countryCode: 'US',
          isVpn: false,
          isTor: false,
          isProxy: false,
          failedAttempts: 0,
          status: DeviceStatus.ACTIVE,
        } as DeviceTracker,
      ];

      repository.find.mockResolvedValue(mockDevices);
      geolocationService.isImpossibleTravel.mockReturnValue(true);
      geolocationService.calculateDistance.mockReturnValue(3900); // NY to LA distance

      await service.runAnomalyDetection();

      expect(repository.find).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting scheduled anomaly detection scan',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Anomaly detection completed'),
      );
    });

    it('should handle errors gracefully during anomaly detection', async () => {
      repository.find.mockRejectedValue(new Error('Database error'));

      await service.runAnomalyDetection();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during anomaly detection:',
        expect.any(Error),
      );
    });

    it('should group devices by user correctly', async () => {
      const mockDevices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user-1',
          lastSeenAt: new Date(),
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user-2',
          lastSeenAt: new Date(),
        } as DeviceTracker,
        {
          id: 'device-3',
          userId: 'user-1',
          lastSeenAt: new Date(),
        } as DeviceTracker,
      ];

      repository.find.mockResolvedValue(mockDevices);

      await service.runAnomalyDetection();

      expect(repository.find).toHaveBeenCalled();
      // Should process devices grouped by user
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Anomaly detection completed'),
      );
    });
  });

  describe('detectUserAnomalies', () => {
    it('should detect impossible travel anomaly', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user-1',
          lastSeenAt: new Date(),
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          countryName: 'United States',
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user-1',
          lastSeenAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          countryName: 'United States',
        } as DeviceTracker,
      ];

      geolocationService.isImpossibleTravel.mockReturnValue(true);
      geolocationService.calculateDistance.mockReturnValue(3900);

      const result = await service.detectUserAnomalies('user-1', devices);

      expect(result).toHaveLength(1);
      expect(result[0].anomalyType).toBe(AnomalyType.IMPOSSIBLE_TRAVEL);
      expect(result[0].severity).toBe('critical');
      expect(result[0].riskScore).toBe(90);
      expect(result[0].evidence).toHaveProperty('distance', 3900);
    });

    it('should detect rapid device switching', async () => {
      const now = new Date();
      const devices: DeviceTracker[] = Array.from({ length: 7 }, (_, i) => ({
        id: `device-${i + 1}`,
        userId: 'user-1',
        deviceType: DeviceType.DESKTOP,
        lastSeenAt: new Date(now.getTime() - i * 5 * 60 * 1000), // 5 minutes apart
        ipAddress: `192.168.1.${i + 1}`,
      })) as DeviceTracker[];

      const result = await service.detectUserAnomalies('user-1', devices);

      const rapidSwitchingAnomaly = result.find(
        (a) => a.anomalyType === AnomalyType.RAPID_DEVICE_SWITCHING,
      );

      expect(rapidSwitchingAnomaly).toBeDefined();
      expect(rapidSwitchingAnomaly!.severity).toBe('medium');
      expect(rapidSwitchingAnomaly!.evidence.deviceCount).toBe(7);
    });

    it('should detect concurrent sessions from different locations', async () => {
      const now = new Date();
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user-1',
          lastSeenAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          countryName: 'United States',
          ipAddress: '192.168.1.1',
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user-1',
          lastSeenAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          countryName: 'United States',
          ipAddress: '10.0.0.1',
        } as DeviceTracker,
        {
          id: 'device-3',
          userId: 'user-1',
          lastSeenAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
          latitude: 51.5074,
          longitude: -0.1278,
          city: 'London',
          countryName: 'United Kingdom',
          ipAddress: '172.16.0.1',
        } as DeviceTracker,
      ];

      geolocationService.calculateDistance
        .mockReturnValueOnce(3900) // NY to LA
        .mockReturnValueOnce(5500) // NY to London
        .mockReturnValueOnce(8750); // LA to London

      const result = await service.detectUserAnomalies('user-1', devices);

      const concurrentAnomaly = result.find(
        (a) => a.anomalyType === AnomalyType.CONCURRENT_SESSIONS,
      );

      expect(concurrentAnomaly).toBeDefined();
      expect(concurrentAnomaly!.severity).toBe('high');
      expect(concurrentAnomaly!.evidence.sessionCount).toBe(3);
    });
  });

  describe('detectGlobalAnomalies', () => {
    it('should detect suspicious locations', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          countryCode: 'CN',
          countryName: 'China',
          isVpn: false,
          isTor: false,
          isProxy: false,
        } as DeviceTracker,
        {
          id: 'device-2',
          countryCode: 'US',
          countryName: 'United States',
          isVpn: true,
          isTor: true,
          isProxy: true,
        } as DeviceTracker,
      ];

      const result = await service.detectGlobalAnomalies(devices);

      expect(result).toHaveLength(2);

      const chinaAnomaly = result.find((a) => a.deviceId === 'device-1');
      expect(chinaAnomaly!.anomalyType).toBe(AnomalyType.SUSPICIOUS_LOCATION);
      expect(chinaAnomaly!.evidence.riskFactors).toContain(
        'Access from high-risk country: CN',
      );

      const vpnAnomaly = result.find((a) => a.deviceId === 'device-2');
      expect(vpnAnomaly!.anomalyType).toBe(AnomalyType.SUSPICIOUS_LOCATION);
      expect(vpnAnomaly!.evidence.riskFactors).toContain('VPN usage detected');
      expect(vpnAnomaly!.evidence.riskFactors).toContain(
        'Tor network usage detected',
      );
      expect(vpnAnomaly!.evidence.riskFactors).toContain(
        'Proxy usage detected',
      );
    });

    it('should detect multiple failed attempts', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          failedAttempts: 10,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          city: 'New York',
          countryName: 'United States',
        } as DeviceTracker,
        {
          id: 'device-2',
          failedAttempts: 2,
        } as DeviceTracker,
      ];

      const result = await service.detectGlobalAnomalies(devices);

      expect(result).toHaveLength(1);
      expect(result[0].anomalyType).toBe(AnomalyType.MULTIPLE_FAILED_ATTEMPTS);
      expect(result[0].severity).toBe('medium');
      expect(result[0].evidence.failedAttempts).toBe(10);
    });

    it('should not detect anomalies when thresholds are not met', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          countryCode: 'US',
          isVpn: false,
          isTor: false,
          isProxy: false,
          failedAttempts: 2,
        } as DeviceTracker,
      ];

      const result = await service.detectGlobalAnomalies(devices);

      expect(result).toHaveLength(0);
    });
  });

  describe('processAnomalies', () => {
    it('should apply block action for critical anomalies', async () => {
      const anomaly: AnomalyDetectionResult = {
        deviceId: 'device-1',
        anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL,
        severity: 'critical',
        description: 'Test anomaly',
        riskScore: 90,
        recommendations: ['Test recommendation'],
        detectedAt: new Date(),
        evidence: {},
      };

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service['processAnomalies']([anomaly]);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'device-1' },
        {
          status: DeviceStatus.BLOCKED,
          riskLevel: RiskLevel.CRITICAL,
          blockedAt: expect.any(Date),
          blockedReason: 'Anomaly detected: Test anomaly',
        },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Anomaly detected: impossible_travel - Test anomaly',
        expect.any(Object),
      );
    });

    it('should apply flag action for high severity anomalies', async () => {
      const anomaly: AnomalyDetectionResult = {
        deviceId: 'device-1',
        anomalyType: AnomalyType.SUSPICIOUS_LOCATION,
        severity: 'high',
        description: 'Test anomaly',
        riskScore: 70,
        recommendations: ['Test recommendation'],
        detectedAt: new Date(),
        evidence: {},
      };

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service['processAnomalies']([anomaly]);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'device-1' },
        {
          status: DeviceStatus.SUSPICIOUS,
          riskLevel: RiskLevel.HIGH,
          riskScore: 70,
        },
      );
    });

    it('should handle errors during rule action application', async () => {
      const anomaly: AnomalyDetectionResult = {
        deviceId: 'device-1',
        anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL,
        severity: 'critical',
        description: 'Test anomaly',
        riskScore: 90,
        recommendations: ['Test recommendation'],
        detectedAt: new Date(),
        evidence: {},
      };

      repository.update.mockRejectedValue(new Error('Database error'));

      await service['processAnomalies']([anomaly]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to apply rule action for anomaly device-1:',
        expect.any(Error),
      );
    });
  });

  describe('anomaly storage and retrieval', () => {
    it('should store and retrieve device anomalies', async () => {
      const anomaly: AnomalyDetectionResult = {
        deviceId: 'device-1',
        anomalyType: AnomalyType.SUSPICIOUS_LOCATION,
        severity: 'medium',
        description: 'Test anomaly',
        riskScore: 50,
        recommendations: ['Test recommendation'],
        detectedAt: new Date(),
        evidence: {},
      };

      await service['processAnomalies']([anomaly]);

      const deviceAnomalies = await service.getDeviceAnomalies('device-1');
      expect(deviceAnomalies).toHaveLength(1);
      expect(deviceAnomalies[0]).toEqual(anomaly);
    });

    it('should retrieve all anomalies sorted by detection time', async () => {
      const anomaly1: AnomalyDetectionResult = {
        deviceId: 'device-1',
        anomalyType: AnomalyType.SUSPICIOUS_LOCATION,
        severity: 'medium',
        description: 'First anomaly',
        riskScore: 50,
        recommendations: [],
        detectedAt: new Date(Date.now() - 60000), // 1 minute ago
        evidence: {},
      };

      const anomaly2: AnomalyDetectionResult = {
        deviceId: 'device-2',
        anomalyType: AnomalyType.MULTIPLE_FAILED_ATTEMPTS,
        severity: 'low',
        description: 'Second anomaly',
        riskScore: 30,
        recommendations: [],
        detectedAt: new Date(), // Now
        evidence: {},
      };

      await service['processAnomalies']([anomaly1, anomaly2]);

      const allAnomalies = await service.getAllAnomalies();
      expect(allAnomalies).toHaveLength(2);
      expect(allAnomalies[0]).toEqual(anomaly2); // Most recent first
      expect(allAnomalies[1]).toEqual(anomaly1);
    });

    it('should return empty array for device with no anomalies', async () => {
      const deviceAnomalies = await service.getDeviceAnomalies(
        'non-existent-device',
      );
      expect(deviceAnomalies).toEqual([]);
    });
  });

  describe('getAnomalyStatistics', () => {
    it('should calculate anomaly statistics correctly', async () => {
      const anomalies: AnomalyDetectionResult[] = [
        {
          deviceId: 'device-1',
          anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL,
          severity: 'critical',
          description: 'Test',
          riskScore: 90,
          recommendations: [],
          detectedAt: new Date(),
          evidence: {},
        },
        {
          deviceId: 'device-2',
          anomalyType: AnomalyType.IMPOSSIBLE_TRAVEL,
          severity: 'high',
          description: 'Test',
          riskScore: 70,
          recommendations: [],
          detectedAt: new Date(),
          evidence: {},
        },
        {
          deviceId: 'device-3',
          anomalyType: AnomalyType.SUSPICIOUS_LOCATION,
          severity: 'medium',
          description: 'Test',
          riskScore: 50,
          recommendations: [],
          detectedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
          evidence: {},
        },
      ];

      await service['processAnomalies'](anomalies);

      const stats = await service.getAnomalyStatistics();

      expect(stats.totalAnomalies).toBe(3);
      expect(stats.anomaliesByType[AnomalyType.IMPOSSIBLE_TRAVEL]).toBe(2);
      expect(stats.anomaliesByType[AnomalyType.SUSPICIOUS_LOCATION]).toBe(1);
      expect(stats.anomaliesBySeverity.critical).toBe(1);
      expect(stats.anomaliesBySeverity.high).toBe(1);
      expect(stats.anomaliesBySeverity.medium).toBe(1);
      expect(stats.recentAnomalies).toHaveLength(2); // Only last 24 hours
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle devices without location data gracefully', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user-1',
          lastSeenAt: new Date(),
          latitude: null,
          longitude: null,
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user-1',
          lastSeenAt: new Date(Date.now() - 60 * 60 * 1000),
          latitude: undefined,
          longitude: undefined,
        } as DeviceTracker,
      ];

      const result = await service.detectUserAnomalies('user-1', devices);

      // Should not detect impossible travel without location data
      const travelAnomalies = result.filter(
        (a) => a.anomalyType === AnomalyType.IMPOSSIBLE_TRAVEL,
      );
      expect(travelAnomalies).toHaveLength(0);
    });

    it('should handle empty device arrays', async () => {
      const userResult = await service.detectUserAnomalies('user-1', []);
      const globalResult = await service.detectGlobalAnomalies([]);

      expect(userResult).toEqual([]);
      expect(globalResult).toEqual([]);
    });

    it('should handle devices without user IDs', async () => {
      const devices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: null,
          lastSeenAt: new Date(),
        } as DeviceTracker,
      ];

      repository.find.mockResolvedValue(devices);

      await service.runAnomalyDetection();

      // Should not cause errors, devices without user IDs are ignored for user-based analysis
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Anomaly detection completed'),
      );
    });
  });
});
