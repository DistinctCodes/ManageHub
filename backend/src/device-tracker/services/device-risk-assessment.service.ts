import { Injectable } from '@nestjs/common';
import { DeviceTracker, RiskLevel } from '../entities/device-tracker.entity';

export interface RiskAssessmentResult {
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  recommendations: string[];
  shouldBlock: boolean;
}

export interface SecurityFlags {
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isNewLocation: boolean;
  isNewDevice: boolean;
  hasHighFailedAttempts: boolean;
  isSuspiciousUserAgent: boolean;
}

@Injectable()
export class DeviceRiskAssessmentService {
  private readonly RISK_WEIGHTS = {
    VPN_USAGE: 15,
    PROXY_USAGE: 20,
    TOR_USAGE: 40,
    HOSTING_IP: 25,
    NEW_LOCATION: 10,
    NEW_DEVICE: 8,
    HIGH_FAILED_ATTEMPTS: 30,
    SUSPICIOUS_USER_AGENT: 12,
    UNTRUSTED_DEVICE: 20,
    MULTIPLE_USERS_SAME_IP: 15,
    RAPID_LOCATION_CHANGE: 25,
    BLOCKED_COUNTRY: 35,
  };

  private readonly SUSPICIOUS_USER_AGENTS = [
    'curl',
    'wget',
    'python',
    'bot',
    'spider',
    'crawler',
    'scraper',
    'postman',
  ];

  private readonly HIGH_RISK_COUNTRIES = [
    'CN', 'RU', 'IR', 'KP', 'BY',
  ];

  calculateRiskScore(
    device: Partial<DeviceTracker>,
    securityFlags: SecurityFlags,
    existingDevices?: DeviceTracker[],
  ): RiskAssessmentResult {
    let riskScore = 0;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (securityFlags.isVpn) {
      riskScore += this.RISK_WEIGHTS.VPN_USAGE;
      riskFactors.push('VPN usage detected');
    }

    if (securityFlags.isProxy) {
      riskScore += this.RISK_WEIGHTS.PROXY_USAGE;
      riskFactors.push('Proxy usage detected');
    }

    if (securityFlags.isTor) {
      riskScore += this.RISK_WEIGHTS.TOR_USAGE;
      riskFactors.push('Tor network usage detected');
    }

    if (securityFlags.isHosting) {
      riskScore += this.RISK_WEIGHTS.HOSTING_IP;
      riskFactors.push('Request from hosting/datacenter IP');
    }

    if (securityFlags.isNewLocation) {
      riskScore += this.RISK_WEIGHTS.NEW_LOCATION;
      riskFactors.push('New geographic location');
    }

    if (securityFlags.isNewDevice) {
      riskScore += this.RISK_WEIGHTS.NEW_DEVICE;
      riskFactors.push('New device detected');
    }

    if (securityFlags.hasHighFailedAttempts) {
      riskScore += this.RISK_WEIGHTS.HIGH_FAILED_ATTEMPTS;
      riskFactors.push('High number of failed login attempts');
    }

    if (securityFlags.isSuspiciousUserAgent) {
      riskScore += this.RISK_WEIGHTS.SUSPICIOUS_USER_AGENT;
      riskFactors.push('Suspicious user agent detected');
    }

    if (device.isTrusted === false) {
      riskScore += this.RISK_WEIGHTS.UNTRUSTED_DEVICE;
      riskFactors.push('Device not marked as trusted');
    }

    if (device.countryCode && this.HIGH_RISK_COUNTRIES.includes(device.countryCode)) {
      riskScore += this.RISK_WEIGHTS.BLOCKED_COUNTRY;
      riskFactors.push(`Access from high-risk country: ${device.countryCode}`);
    }

    const riskLevel = this.determineRiskLevel(riskScore);
    const shouldBlock = riskLevel === RiskLevel.CRITICAL || riskScore >= 80;

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      riskFactors,
      recommendations,
      shouldBlock,
    };
  }

  assessSecurityFlags(
    device: Partial<DeviceTracker>,
    existingDevices?: DeviceTracker[],
  ): SecurityFlags {
    return {
      isVpn: device.isVpn || false,
      isProxy: device.isProxy || false,
      isTor: device.isTor || false,
      isHosting: device.isHosting || false,
      isNewLocation: this.isNewLocation(device, existingDevices),
      isNewDevice: this.isNewDevice(device, existingDevices),
      hasHighFailedAttempts: (device.failedAttempts || 0) >= 5,
      isSuspiciousUserAgent: this.isSuspiciousUserAgent(device.userAgent),
    };
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 70) return RiskLevel.CRITICAL;
    if (score >= 45) return RiskLevel.HIGH;
    if (score >= 20) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private isNewLocation(
    device: Partial<DeviceTracker>,
    existingDevices?: DeviceTracker[],
  ): boolean {
    if (!existingDevices || !device.userId || !device.countryCode) return false;
    const userDevices = existingDevices.filter(d => d.userId === device.userId);
    return !userDevices.some(d => d.countryCode === device.countryCode);
  }

  private isNewDevice(
    device: Partial<DeviceTracker>,
    existingDevices?: DeviceTracker[],
  ): boolean {
    if (!existingDevices || !device.deviceFingerprint) return true;
    return !existingDevices.some(d => d.deviceFingerprint === device.deviceFingerprint);
  }

  private isSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true;
    const lowerAgent = userAgent.toLowerCase();
    return this.SUSPICIOUS_USER_AGENTS.some(suspicious =>
      lowerAgent.includes(suspicious)
    );
  }

  private checkMultipleUsersFromSameIP(
    device: Partial<DeviceTracker>,
    existingDevices: DeviceTracker[],
  ): boolean {
    if (!device.ipAddress || !device.userId) return false;
    const sameIpDevices = existingDevices.filter(d => d.ipAddress === device.ipAddress);
    const uniqueUsers = new Set(sameIpDevices.map(d => d.userId).filter(Boolean));
    return uniqueUsers.size > 3;
  }

  private checkRapidLocationChange(
    device: Partial<DeviceTracker>,
    existingDevices: DeviceTracker[],
  ): boolean {
    if (!device.userId || !device.latitude || !device.longitude) return false;
    const userDevices = existingDevices
      .filter(d => d.userId === device.userId && d.latitude && d.longitude)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
    if (userDevices.length === 0) return false;
    const lastDevice = userDevices[0];
    const distance = this.calculateDistance(
      device.latitude,
      device.longitude,
      lastDevice.latitude!,
      lastDevice.longitude!,
    );
    const timeDiffHours = (Date.now() - lastDevice.lastSeenAt.getTime()) / (1000 * 60 * 60);
    return distance > 1000 && timeDiffHours < 2;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}