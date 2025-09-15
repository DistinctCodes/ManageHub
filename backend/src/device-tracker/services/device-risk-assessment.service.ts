import { Injectable } from '@nestjs/common';
import { DeviceTracker, RiskLevel, DeviceStatus } from '../entities/device-tracker.entity';

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
    'CN', 'RU', 'IR', 'KP', 'BY', // Add country codes as needed
  ];

  calculateRiskScore(
    device: Partial<DeviceTracker>,
    securityFlags: SecurityFlags,
    existingDevices?: DeviceTracker[],
  ): RiskAssessmentResult {
    let riskScore = 0;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Check VPN usage
    if (securityFlags.isVpn) {
      riskScore += this.RISK_WEIGHTS.VPN_USAGE;
      riskFactors.push('VPN usage detected');
      recommendations.push('Consider requiring additional verification for VPN users');
    }

    // Check proxy usage
    if (securityFlags.isProxy) {
      riskScore += this.RISK_WEIGHTS.PROXY_USAGE;
      riskFactors.push('Proxy usage detected');
      recommendations.push('Monitor proxy traffic closely');
    }

    // Check Tor usage
    if (securityFlags.isTor) {
      riskScore += this.RISK_WEIGHTS.TOR_USAGE;
      riskFactors.push('Tor network usage detected');
      recommendations.push('Consider blocking Tor traffic or requiring manual approval');
    }

    // Check hosting IP
    if (securityFlags.isHosting) {
      riskScore += this.RISK_WEIGHTS.HOSTING_IP;
      riskFactors.push('Request from hosting/datacenter IP');
      recommendations.push('Verify legitimate business use of hosting IP');
    }

    // Check new location
    if (securityFlags.isNewLocation) {
      riskScore += this.RISK_WEIGHTS.NEW_LOCATION;
      riskFactors.push('New geographic location');
      recommendations.push('Send location change notification to user');
    }

    // Check new device
    if (securityFlags.isNewDevice) {
      riskScore += this.RISK_WEIGHTS.NEW_DEVICE;
      riskFactors.push('New device detected');
      recommendations.push('Require device verification');
    }

    // Check failed attempts
    if (securityFlags.hasHighFailedAttempts) {
      riskScore += this.RISK_WEIGHTS.HIGH_FAILED_ATTEMPTS;
      riskFactors.push('High number of failed login attempts');
      recommendations.push('Implement account lockout or CAPTCHA');
    }

    // Check suspicious user agent
    if (securityFlags.isSuspiciousUserAgent) {
      riskScore += this.RISK_WEIGHTS.SUSPICIOUS_USER_AGENT;
      riskFactors.push('Suspicious user agent detected');
      recommendations.push('Block automated/bot traffic');
    }

    // Check if device is untrusted
    if (device.isTrusted === false) {
      riskScore += this.RISK_WEIGHTS.UNTRUSTED_DEVICE;
      riskFactors.push('Device not marked as trusted');
      recommendations.push('Require manual device approval');
    }

    // Check high-risk countries
    if (device.countryCode && this.HIGH_RISK_COUNTRIES.includes(device.countryCode)) {
      riskScore += this.RISK_WEIGHTS.BLOCKED_COUNTRY;
      riskFactors.push(`Access from high-risk country: ${device.countryCode}`);
      recommendations.push('Apply enhanced security measures for high-risk regions');
    }

    // Check for multiple users from same IP
    if (existingDevices && this.checkMultipleUsersFromSameIP(device, existingDevices)) {
      riskScore += this.RISK_WEIGHTS.MULTIPLE_USERS_SAME_IP;
      riskFactors.push('Multiple users accessing from same IP address');
      recommendations.push('Investigate potential shared or compromised network');
    }

    // Check for rapid location changes
    if (existingDevices && this.checkRapidLocationChange(device, existingDevices)) {
      riskScore += this.RISK_WEIGHTS.RAPID_LOCATION_CHANGE;
      riskFactors.push('Rapid geographic location changes detected');
      recommendations.push('Verify user identity due to impossible travel');
    }

    const riskLevel = this.determineRiskLevel(riskScore);
    const shouldBlock = riskLevel === RiskLevel.CRITICAL || riskScore >= 80;

    return {\n      riskScore: Math.min(riskScore, 100), // Cap at 100\n      riskLevel,\n      riskFactors,\n      recommendations,\n      shouldBlock,\n    };\n  }\n\n  assessSecurityFlags(\n    device: Partial<DeviceTracker>,\n    existingDevices?: DeviceTracker[],\n  ): SecurityFlags {\n    return {\n      isVpn: device.isVpn || false,\n      isProxy: device.isProxy || false,\n      isTor: device.isTor || false,\n      isHosting: device.isHosting || false,\n      isNewLocation: this.isNewLocation(device, existingDevices),\n      isNewDevice: this.isNewDevice(device, existingDevices),\n      hasHighFailedAttempts: (device.failedAttempts || 0) >= 5,\n      isSuspiciousUserAgent: this.isSuspiciousUserAgent(device.userAgent),\n    };\n  }\n\n  private determineRiskLevel(score: number): RiskLevel {\n    if (score >= 70) return RiskLevel.CRITICAL;\n    if (score >= 45) return RiskLevel.HIGH;\n    if (score >= 20) return RiskLevel.MEDIUM;\n    return RiskLevel.LOW;\n  }\n\n  private isNewLocation(\n    device: Partial<DeviceTracker>,\n    existingDevices?: DeviceTracker[],\n  ): boolean {\n    if (!existingDevices || !device.userId || !device.countryCode) return false;\n\n    const userDevices = existingDevices.filter(d => d.userId === device.userId);\n    return !userDevices.some(d => d.countryCode === device.countryCode);\n  }\n\n  private isNewDevice(\n    device: Partial<DeviceTracker>,\n    existingDevices?: DeviceTracker[],\n  ): boolean {\n    if (!existingDevices || !device.deviceFingerprint) return true;\n\n    return !existingDevices.some(d => d.deviceFingerprint === device.deviceFingerprint);\n  }\n\n  private isSuspiciousUserAgent(userAgent?: string): boolean {\n    if (!userAgent) return true;\n\n    const lowerAgent = userAgent.toLowerCase();\n    return this.SUSPICIOUS_USER_AGENTS.some(suspicious =>\n      lowerAgent.includes(suspicious)\n    );\n  }\n\n  private checkMultipleUsersFromSameIP(\n    device: Partial<DeviceTracker>,\n    existingDevices: DeviceTracker[],\n  ): boolean {\n    if (!device.ipAddress || !device.userId) return false;\n\n    const sameIpDevices = existingDevices.filter(d => d.ipAddress === device.ipAddress);\n    const uniqueUsers = new Set(sameIpDevices.map(d => d.userId).filter(Boolean));\n\n    return uniqueUsers.size > 3; // More than 3 users from same IP is suspicious\n  }\n\n  private checkRapidLocationChange(\n    device: Partial<DeviceTracker>,\n    existingDevices: DeviceTracker[],\n  ): boolean {\n    if (!device.userId || !device.latitude || !device.longitude) return false;\n\n    const userDevices = existingDevices\n      .filter(d => d.userId === device.userId && d.latitude && d.longitude)\n      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());\n\n    if (userDevices.length === 0) return false;\n\n    const lastDevice = userDevices[0];\n    const distance = this.calculateDistance(\n      device.latitude,\n      device.longitude,\n      lastDevice.latitude!,\n      lastDevice.longitude!,\n    );\n\n    const timeDiffHours = \n      (Date.now() - lastDevice.lastSeenAt.getTime()) / (1000 * 60 * 60);\n\n    // If distance > 1000km and time < 2 hours, it's suspicious\n    return distance > 1000 && timeDiffHours < 2;\n  }\n\n  private calculateDistance(\n    lat1: number,\n    lon1: number,\n    lat2: number,\n    lon2: number,\n  ): number {\n    const R = 6371; // Earth's radius in kilometers\n    const dLat = this.toRadians(lat2 - lat1);\n    const dLon = this.toRadians(lon2 - lon1);\n    const a =\n      Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n      Math.cos(this.toRadians(lat1)) *\n        Math.cos(this.toRadians(lat2)) *\n        Math.sin(dLon / 2) *\n        Math.sin(dLon / 2);\n    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n    return R * c;\n  }\n\n  private toRadians(degrees: number): number {\n    return degrees * (Math.PI / 180);\n  }\n}