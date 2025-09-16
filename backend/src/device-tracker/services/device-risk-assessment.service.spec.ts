import { Test, TestingModule } from '@nestjs/testing';
import {
  DeviceRiskAssessmentService,
  SecurityFlags,
  RiskAssessmentResult,
} from './device-risk-assessment.service';
import {
  DeviceTracker,
  DeviceType,
  RiskLevel,
} from '../entities/device-tracker.entity';

describe('DeviceRiskAssessmentService', () => {
  let service: DeviceRiskAssessmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceRiskAssessmentService],
    }).compile();

    service = module.get<DeviceRiskAssessmentService>(
      DeviceRiskAssessmentService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRiskScore', () => {
    it('should calculate low risk for normal device', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
        countryCode: 'US',
        isTrusted: true,
        isVpn: false,
        isTor: false,
        isProxy: false,
      };

      const securityFlags: SecurityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: false,
        isNewDevice: false,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskScore).toBeLessThan(20);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.shouldBlock).toBe(false);
    });

    it('should calculate high risk for VPN usage', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '10.0.0.1',
        isVpn: true,
        isTor: false,
        isProxy: false,
      };

      const securityFlags: SecurityFlags = {
        isVpn: true,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: false,
        isNewDevice: false,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskScore).toBeGreaterThan(10);
      expect(result.riskFactors).toContain('VPN usage detected');
    });

    it('should calculate critical risk for Tor usage', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '185.220.101.1',
        isTor: true,
        isVpn: false,
        isProxy: false,
      };

      const securityFlags: SecurityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: true,
        isHosting: false,
        isNewLocation: false,
        isNewDevice: false,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskScore).toBeGreaterThan(35);
      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.riskLevel);
      expect(result.riskFactors).toContain('Tor network usage detected');
    });

    it('should calculate high risk for high-risk country', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '1.2.3.4',
        countryCode: 'CN',
        isTrusted: false,
      };

      const securityFlags: SecurityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: true,
        isNewDevice: true,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskFactors).toContain('Access from high-risk country: CN');
      expect(result.riskScore).toBeGreaterThan(30);
    });

    it('should calculate high risk for multiple failed attempts', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
        failedAttempts: 8,
      };

      const securityFlags: SecurityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: false,
        isNewDevice: false,
        hasHighFailedAttempts: true,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskFactors).toContain(
        'High number of failed login attempts',
      );
      expect(result.riskScore).toBeGreaterThan(25);
    });

    it('should recommend blocking for critical risk', () => {
      const device: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '185.220.101.1',
        countryCode: 'CN',
        isTor: true,
        isVpn: true,
        isTrusted: false,
      };

      const securityFlags: SecurityFlags = {
        isVpn: true,
        isProxy: false,
        isTor: true,
        isHosting: false,
        isNewLocation: true,
        isNewDevice: true,
        hasHighFailedAttempts: true,
        isSuspiciousUserAgent: true,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(result.shouldBlock).toBe(true);
      expect(result.riskScore).toBeGreaterThan(70);
    });
  });

  describe('assessSecurityFlags', () => {
    it('should detect new device correctly', () => {
      const device: Partial<DeviceTracker> = {
        deviceFingerprint: 'new-fingerprint',
        userId: 'user123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };

      const existingDevices: DeviceTracker[] = [
        {
          id: 'device-1',
          deviceFingerprint: 'existing-fingerprint',
          userId: 'user123',
        } as DeviceTracker,
      ];

      const flags = service.assessSecurityFlags(device, existingDevices);

      expect(flags.isNewDevice).toBe(true);
      expect(flags.isSuspiciousUserAgent).toBe(false);
    });

    it('should detect suspicious user agent', () => {
      const device: Partial<DeviceTracker> = {
        userAgent: 'curl/7.68.0',
        isVpn: false,
        isTor: false,
        isProxy: false,
      };

      const flags = service.assessSecurityFlags(device);

      expect(flags.isSuspiciousUserAgent).toBe(true);
    });

    it('should detect new location correctly', () => {
      const device: Partial<DeviceTracker> = {
        userId: 'user123',
        countryCode: 'FR',
      };

      const existingDevices: DeviceTracker[] = [
        {
          id: 'device-1',
          userId: 'user123',
          countryCode: 'US',
        } as DeviceTracker,
        {
          id: 'device-2',
          userId: 'user123',
          countryCode: 'CA',
        } as DeviceTracker,
      ];

      const flags = service.assessSecurityFlags(device, existingDevices);

      expect(flags.isNewLocation).toBe(true);
    });

    it('should detect high failed attempts', () => {
      const device: Partial<DeviceTracker> = {
        failedAttempts: 6,
      };

      const flags = service.assessSecurityFlags(device);

      expect(flags.hasHighFailedAttempts).toBe(true);
    });

    it('should correctly identify security threats', () => {
      const device: Partial<DeviceTracker> = {
        isVpn: true,
        isTor: false,
        isProxy: true,
        isHosting: true,
      };

      const flags = service.assessSecurityFlags(device);

      expect(flags.isVpn).toBe(true);
      expect(flags.isTor).toBe(false);
      expect(flags.isProxy).toBe(true);
      expect(flags.isHosting).toBe(true);
    });
  });

  describe('risk level determination', () => {
    it('should classify risk levels correctly', () => {
      // Test low risk
      const lowRiskDevice: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        isTrusted: true,
      };
      const lowFlags: SecurityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: false,
        isNewDevice: false,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };
      const lowResult = service.calculateRiskScore(lowRiskDevice, lowFlags);
      expect(lowResult.riskLevel).toBe(RiskLevel.LOW);

      // Test medium risk
      const mediumRiskDevice: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        isTrusted: false,
      };
      const mediumFlags: SecurityFlags = {
        ...lowFlags,
        isNewDevice: true,
        isNewLocation: true,
      };
      const mediumResult = service.calculateRiskScore(
        mediumRiskDevice,
        mediumFlags,
      );
      expect([RiskLevel.LOW, RiskLevel.MEDIUM]).toContain(
        mediumResult.riskLevel,
      );

      // Test high risk
      const highRiskDevice: Partial<DeviceTracker> = {
        deviceType: DeviceType.DESKTOP,
        isVpn: true,
        countryCode: 'CN',
      };
      const highFlags: SecurityFlags = {
        ...lowFlags,
        isVpn: true,
        isNewDevice: true,
        hasHighFailedAttempts: true,
      };
      const highResult = service.calculateRiskScore(highRiskDevice, highFlags);
      expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(
        highResult.riskLevel,
      );
    });
  });

  describe('recommendations', () => {
    it('should provide appropriate recommendations based on risk factors', () => {
      const device: Partial<DeviceTracker> = {
        isTor: true,
        isVpn: true,
        countryCode: 'CN',
      };

      const securityFlags: SecurityFlags = {
        isVpn: true,
        isProxy: false,
        isTor: true,
        isHosting: false,
        isNewLocation: true,
        isNewDevice: true,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const result = service.calculateRiskScore(device, securityFlags);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
      expect(result.riskFactors.length).toBeGreaterThan(0);
    });
  });
});
