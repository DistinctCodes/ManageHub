import { Injectable, Logger } from '@nestjs/common';
import { DeviceTracker } from '../entities/device-tracker.entity';

export interface GeolocationData {
  ip: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface IPAnalysisResult {
  geolocation: GeolocationData;
  securityFlags: {
    isPrivateIP: boolean;
    isLocalhost: boolean;
    isReserved: boolean;
    isSuspicious: boolean;
  };
  recommendations: string[];
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  // Mock database of known VPN/Proxy/Tor IPs
  private readonly vpnRanges: string[] = [
    // Add known VPN IP ranges
    '185.220.', // Example Tor range
    '192.42.116.', // Example VPN range
  ];

  private readonly hostingProviders: string[] = [
    'amazon',
    'google',
    'microsoft',
    'digitalocean',
    'linode',
    'vultr',
    'ovh',
    'hetzner',
    'cloudflare',
  ];

  private readonly suspiciousISPs: string[] = [
    'tor',
    'vpn',
    'proxy',
    'anonymous',
    'privacy',
  ];

  async analyzeIP(ipAddress: string): Promise<IPAnalysisResult> {
    try {
      const geolocation = await this.getGeolocationData(ipAddress);
      const securityFlags = this.analyzeSecurityFlags(ipAddress, geolocation);
      const recommendations = this.generateRecommendations(
        geolocation,
        securityFlags,
      );

      return {
        geolocation,
        securityFlags,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze IP ${ipAddress}:`, error);
      return this.getDefaultAnalysis(ipAddress);
    }
  }

  async getGeolocationData(ipAddress: string): Promise<GeolocationData> {
    // In a real implementation, you would call external APIs like:
    // - MaxMind GeoIP2
    // - IP2Location
    // - ipapi.co
    // - ipgeolocation.io

    // For demo purposes, we'll simulate the response
    return this.simulateGeolocationAPI(ipAddress);
  }

  async updateDeviceGeolocation(
    device: Partial<DeviceTracker>,
  ): Promise<Partial<DeviceTracker>> {
    if (!device.ipAddress) {
      return device;
    }

    try {
      const analysis = await this.analyzeIP(device.ipAddress);
      const { geolocation } = analysis;

      return {
        ...device,
        countryCode: geolocation.countryCode,
        countryName: geolocation.countryName,
        region: geolocation.region,
        city: geolocation.city,
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        timezone: geolocation.timezone,
        isp: geolocation.isp,
        organization: geolocation.organization,
        isVpn: geolocation.isVpn,
        isProxy: geolocation.isProxy,
        isTor: geolocation.isTor,
        isHosting: geolocation.isHosting,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update geolocation for IP ${device.ipAddress}:`,
        error,
      );
      return device;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
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

  isImpossibleTravel(
    location1: { latitude: number; longitude: number; timestamp: Date },
    location2: { latitude: number; longitude: number; timestamp: Date },
    maxSpeedKmh: number = 1000, // Commercial flight speed
  ): boolean {
    const distance = this.calculateDistance(
      location1.latitude,
      location1.longitude,
      location2.latitude,
      location2.longitude,
    );

    const timeDiffHours =
      Math.abs(location2.timestamp.getTime() - location1.timestamp.getTime()) /
      (1000 * 60 * 60);

    const requiredSpeed = distance / timeDiffHours;

    return requiredSpeed > maxSpeedKmh;
  }

  async detectLocationAnomalies(
    userId: string,
    currentLocation: { latitude: number; longitude: number },
    recentLocations: Array<{
      latitude: number;
      longitude: number;
      timestamp: Date;
    }>,
  ): Promise<{
    isAnomalous: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    if (recentLocations.length === 0) {
      return {
        isAnomalous: false,
        reasons: ['No previous location data'],
        riskScore: 0,
      };
    }

    // Check for impossible travel
    const recentLocation = recentLocations[0];
    const isImpossible = this.isImpossibleTravel(
      {
        latitude: recentLocation.latitude,
        longitude: recentLocation.longitude,
        timestamp: recentLocation.timestamp,
      },
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: new Date(),
      },
    );

    if (isImpossible) {
      reasons.push('Impossible travel detected');
      riskScore += 40;
    }

    // Check for unusual distance from typical locations
    const avgDistance = this.calculateAverageDistance(
      currentLocation,
      recentLocations,
    );
    if (avgDistance > 500) {
      // More than 500km from usual locations
      reasons.push('Unusual distance from typical locations');
      riskScore += 20;
    }

    // Check for rapid location changes
    const rapidChanges = this.detectRapidLocationChanges(recentLocations);
    if (rapidChanges > 3) {
      reasons.push('Multiple rapid location changes detected');
      riskScore += 15;
    }

    return {
      isAnomalous: riskScore > 25,
      reasons,
      riskScore,
    };
  }

  private simulateGeolocationAPI(ipAddress: string): GeolocationData {
    // Simulate different IP patterns for demo
    const isPrivate = this.isPrivateIP(ipAddress);
    const isLocalhost = ipAddress === '127.0.0.1' || ipAddress === '::1';

    if (isPrivate || isLocalhost) {
      return {
        ip: ipAddress,
        countryCode: 'US',
        countryName: 'United States',
        region: 'Private Network',
        city: 'Local',
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        threatLevel: 'low',
      };
    }

    // Simulate based on IP patterns
    const isVpn = this.vpnRanges.some((range) => ipAddress.startsWith(range));
    const isTor = ipAddress.startsWith('185.220.'); // Known Tor range
    const isHosting = Math.random() < 0.1; // 10% chance for hosting

    // Mock geolocation data
    const mockLocations = [
      {
        country: 'US',
        countryName: 'United States',
        region: 'California',
        city: 'San Francisco',
        lat: 37.7749,
        lon: -122.4194,
      },
      {
        country: 'GB',
        countryName: 'United Kingdom',
        region: 'England',
        city: 'London',
        lat: 51.5074,
        lon: -0.1278,
      },
      {
        country: 'DE',
        countryName: 'Germany',
        region: 'Berlin',
        city: 'Berlin',
        lat: 52.52,
        lon: 13.405,
      },
      {
        country: 'JP',
        countryName: 'Japan',
        region: 'Tokyo',
        city: 'Tokyo',
        lat: 35.6762,
        lon: 139.6503,
      },
    ];

    const location =
      mockLocations[Math.floor(Math.random() * mockLocations.length)];

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (isTor) threatLevel = 'critical';
    else if (isVpn) threatLevel = 'high';
    else if (isHosting) threatLevel = 'medium';

    return {
      ip: ipAddress,
      countryCode: location.country,
      countryName: location.countryName,
      region: location.region,
      city: location.city,
      latitude: location.lat + (Math.random() - 0.5) * 0.1, // Add some variance
      longitude: location.lon + (Math.random() - 0.5) * 0.1,
      timezone: 'UTC',
      isp: isHosting ? 'Amazon AWS' : 'ISP Provider',
      organization: isHosting ? 'Amazon.com Inc.' : 'Local ISP',
      isVpn,
      isProxy: Math.random() < 0.05, // 5% chance
      isTor,
      isHosting,
      threatLevel,
    };
  }

  private analyzeSecurityFlags(
    ipAddress: string,
    geolocation: GeolocationData,
  ): {
    isPrivateIP: boolean;
    isLocalhost: boolean;
    isReserved: boolean;
    isSuspicious: boolean;
  } {
    const isPrivateIP = this.isPrivateIP(ipAddress);
    const isLocalhost = ipAddress === '127.0.0.1' || ipAddress === '::1';
    const isReserved = this.isReservedIP(ipAddress);

    const isSuspicious =
      geolocation.isVpn ||
      geolocation.isProxy ||
      geolocation.isTor ||
      (geolocation.isp &&
        this.suspiciousISPs.some((sus) =>
          geolocation.isp!.toLowerCase().includes(sus),
        ));

    return {
      isPrivateIP,
      isLocalhost,
      isReserved,
      isSuspicious,
    };
  }

  private generateRecommendations(
    geolocation: GeolocationData,
    securityFlags: {
      isPrivateIP: boolean;
      isLocalhost: boolean;
      isReserved: boolean;
      isSuspicious: boolean;
    },
  ): string[] {
    const recommendations: string[] = [];

    if (geolocation.isTor) {
      recommendations.push('Block Tor traffic or require manual approval');
    }

    if (geolocation.isVpn) {
      recommendations.push('Apply additional verification for VPN users');
    }

    if (geolocation.isHosting) {
      recommendations.push('Monitor traffic from hosting providers closely');
    }

    if (securityFlags.isSuspicious) {
      recommendations.push('Apply enhanced security measures');
    }

    if (geolocation.threatLevel === 'critical') {
      recommendations.push('Consider blocking this IP immediately');
    }

    return recommendations;
  }

  private getDefaultAnalysis(ipAddress: string): IPAnalysisResult {
    return {
      geolocation: {
        ip: ipAddress,
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        threatLevel: 'low',
      },
      securityFlags: {
        isPrivateIP: this.isPrivateIP(ipAddress),
        isLocalhost: ipAddress === '127.0.0.1',
        isReserved: this.isReservedIP(ipAddress),
        isSuspicious: false,
      },
      recommendations: [
        'Unable to analyze IP - apply default security measures',
      ],
    };
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\\./,
      /^172\\.(1[6-9]|2[0-9]|3[01])\\./,
      /^192\\.168\\./,
      /^127\\./,
      /^169\\.254\\./,
      /^fc00:/i,
      /^fe80:/i,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  private isReservedIP(ip: string): boolean {
    const reservedRanges = [/^0\\./, /^224\\./, /^240\\./, /^255\\./];

    return reservedRanges.some((range) => range.test(ip));
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateAverageDistance(
    currentLocation: { latitude: number; longitude: number },
    locations: Array<{ latitude: number; longitude: number }>,
  ): number {
    if (locations.length === 0) return 0;

    const totalDistance = locations.reduce((sum, location) => {
      return (
        sum +
        this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude,
        )
      );
    }, 0);

    return totalDistance / locations.length;
  }

  private detectRapidLocationChanges(
    locations: Array<{ latitude: number; longitude: number; timestamp: Date }>,
  ): number {
    if (locations.length < 2) return 0;

    let rapidChanges = 0;

    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(
        locations[i - 1].latitude,
        locations[i - 1].longitude,
        locations[i].latitude,
        locations[i].longitude,
      );

      const timeDiffHours =
        Math.abs(
          locations[i].timestamp.getTime() -
            locations[i - 1].timestamp.getTime(),
        ) /
        (1000 * 60 * 60);

      // If moved more than 100km in less than 1 hour
      if (distance > 100 && timeDiffHours < 1) {
        rapidChanges++;
      }
    }

    return rapidChanges;
  }
}
