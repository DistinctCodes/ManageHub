import { Test, TestingModule } from '@nestjs/testing';
import {
  GeolocationService,
  GeolocationData,
  IPAnalysisResult,
} from './geolocation.service';
import { DeviceTracker } from '../entities/device-tracker.entity';
import { Logger } from '@nestjs/common';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeolocationService,
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GeolocationService>(GeolocationService);
    logger = module.get<Logger>(Logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeIP', () => {
    it('should analyze a normal IP address', async () => {
      const result = await service.analyzeIP('8.8.8.8');

      expect(result).toHaveProperty('geolocation');
      expect(result).toHaveProperty('securityFlags');
      expect(result).toHaveProperty('recommendations');
      expect(result.geolocation.ip).toBe('8.8.8.8');
      expect(typeof result.geolocation.isVpn).toBe('boolean');
      expect(typeof result.geolocation.isProxy).toBe('boolean');
      expect(typeof result.geolocation.isTor).toBe('boolean');
    });

    it('should analyze a private IP address', async () => {
      const result = await service.analyzeIP('192.168.1.1');

      expect(result.securityFlags.isPrivateIP).toBe(true);
      expect(result.geolocation.threatLevel).toBe('low');
    });

    it('should analyze localhost IP address', async () => {
      const result = await service.analyzeIP('127.0.0.1');

      expect(result.securityFlags.isLocalhost).toBe(true);
      expect(result.securityFlags.isPrivateIP).toBe(true);
    });

    it('should detect VPN IP addresses', async () => {
      const result = await service.analyzeIP('192.42.116.1');

      expect(result.geolocation.isVpn).toBe(true);
      expect(result.geolocation.threatLevel).toBe('high');
    });

    it('should detect Tor IP addresses', async () => {
      const result = await service.analyzeIP('185.220.101.1');

      expect(result.geolocation.isTor).toBe(true);
      expect(result.geolocation.threatLevel).toBe('critical');
    });

    it('should handle errors gracefully', async () => {
      // Mock error in geolocation lookup
      jest
        .spyOn(service, 'getGeolocationData')
        .mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeIP('1.2.3.4');

      expect(result).toHaveProperty('geolocation');
      expect(result).toHaveProperty('securityFlags');
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toContain(
        'Unable to analyze IP - apply default security measures',
      );
    });
  });

  describe('getGeolocationData', () => {
    it('should return geolocation data for any IP', async () => {
      const result = await service.getGeolocationData('8.8.8.8');

      expect(result).toHaveProperty('ip');
      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('isVpn');
      expect(result).toHaveProperty('isProxy');
      expect(result).toHaveProperty('isTor');
      expect(result).toHaveProperty('threatLevel');
      expect(result.ip).toBe('8.8.8.8');
    });

    it('should handle private IP addresses', async () => {
      const result = await service.getGeolocationData('192.168.1.1');

      expect(result.countryCode).toBe('US');
      expect(result.region).toBe('Private Network');
      expect(result.city).toBe('Local');
      expect(result.isVpn).toBe(false);
      expect(result.threatLevel).toBe('low');
    });

    it('should simulate different threat levels', async () => {
      const normalIP = await service.getGeolocationData('8.8.8.8');
      const torIP = await service.getGeolocationData('185.220.101.1');

      expect(['low', 'medium', 'high', 'critical']).toContain(
        normalIP.threatLevel,
      );
      expect(torIP.threatLevel).toBe('critical');
    });
  });

  describe('updateDeviceGeolocation', () => {
    it('should update device with geolocation data', async () => {
      const device: Partial<DeviceTracker> = {
        ipAddress: '8.8.8.8',
        userId: 'user123',
      };

      const result = await service.updateDeviceGeolocation(device);

      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('countryName');
      expect(result).toHaveProperty('region');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('isVpn');
      expect(result).toHaveProperty('isProxy');
      expect(result).toHaveProperty('isTor');
      expect(result.ipAddress).toBe('8.8.8.8');
      expect(result.userId).toBe('user123');
    });

    it('should return unchanged device when no IP address', async () => {
      const device: Partial<DeviceTracker> = {
        userId: 'user123',
      };

      const result = await service.updateDeviceGeolocation(device);

      expect(result).toEqual(device);
      expect(result).not.toHaveProperty('countryCode');
    });

    it('should handle geolocation errors gracefully', async () => {
      const device: Partial<DeviceTracker> = {
        ipAddress: '8.8.8.8',
        userId: 'user123',
      };

      jest
        .spyOn(service, 'analyzeIP')
        .mockRejectedValue(new Error('Geolocation error'));

      const result = await service.updateDeviceGeolocation(device);

      expect(result).toEqual(device);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between New York and Los Angeles (approximately 3944 km)
      const nyLat = 40.7128;
      const nyLon = -74.006;
      const laLat = 34.0522;
      const laLon = -118.2437;

      const distance = service.calculateDistance(nyLat, nyLon, laLat, laLon);

      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
      );

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = service.calculateDistance(
        -33.8688,
        151.2093,
        51.5074,
        -0.1278,
      );

      expect(distance).toBeGreaterThan(15000); // Sydney to London
    });
  });

  describe('isImpossibleTravel', () => {
    it('should detect impossible travel between distant locations', () => {
      const location1 = {
        latitude: 40.7128, // New York
        longitude: -74.006,
        timestamp: new Date('2023-01-01T10:00:00Z'),
      };

      const location2 = {
        latitude: 34.0522, // Los Angeles
        longitude: -118.2437,
        timestamp: new Date('2023-01-01T11:00:00Z'), // 1 hour later
      };

      const isImpossible = service.isImpossibleTravel(
        location1,
        location2,
        1000,
      );

      expect(isImpossible).toBe(true);
    });

    it('should allow reasonable travel between nearby locations', () => {
      const location1 = {
        latitude: 40.7128, // New York
        longitude: -74.006,
        timestamp: new Date('2023-01-01T10:00:00Z'),
      };

      const location2 = {
        latitude: 40.7589, // Times Square (nearby)
        longitude: -73.9851,
        timestamp: new Date('2023-01-01T10:30:00Z'), // 30 minutes later
      };

      const isImpossible = service.isImpossibleTravel(
        location1,
        location2,
        1000,
      );

      expect(isImpossible).toBe(false);
    });

    it('should allow travel with sufficient time gap', () => {
      const location1 = {
        latitude: 40.7128, // New York
        longitude: -74.006,
        timestamp: new Date('2023-01-01T10:00:00Z'),
      };

      const location2 = {
        latitude: 34.0522, // Los Angeles
        longitude: -118.2437,
        timestamp: new Date('2023-01-01T20:00:00Z'), // 10 hours later
      };

      const isImpossible = service.isImpossibleTravel(
        location1,
        location2,
        1000,
      );

      expect(isImpossible).toBe(false);
    });
  });

  describe('detectLocationAnomalies', () => {
    it('should detect no anomalies with no previous data', async () => {
      const currentLocation = { latitude: 40.7128, longitude: -74.006 };
      const recentLocations: any[] = [];

      const result = await service.detectLocationAnomalies(
        'user123',
        currentLocation,
        recentLocations,
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.reasons).toContain('No previous location data');
      expect(result.riskScore).toBe(0);
    });

    it('should detect impossible travel anomaly', async () => {
      const currentLocation = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
      const recentLocations = [
        {
          latitude: 40.7128, // New York
          longitude: -74.006,
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      ];

      const result = await service.detectLocationAnomalies(
        'user123',
        currentLocation,
        recentLocations,
      );

      expect(result.isAnomalous).toBe(true);
      expect(result.reasons).toContain('Impossible travel detected');
      expect(result.riskScore).toBeGreaterThan(25);
    });

    it('should detect unusual distance from typical locations', async () => {
      const currentLocation = { latitude: 35.6762, longitude: 139.6503 }; // Tokyo
      const recentLocations = [
        {
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }, // New York
        {
          latitude: 41.8781,
          longitude: -87.6298,
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        }, // Chicago
        {
          latitude: 39.7392,
          longitude: -104.9903,
          timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
        }, // Denver
      ];

      const result = await service.detectLocationAnomalies(
        'user123',
        currentLocation,
        recentLocations,
      );

      expect(result.reasons).toContain(
        'Unusual distance from typical locations',
      );
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect rapid location changes', async () => {
      const currentLocation = { latitude: 40.7128, longitude: -74.006 };
      const recentLocations = [
        {
          latitude: 41.8781,
          longitude: -87.6298,
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
        }, // Chicago
        {
          latitude: 39.7392,
          longitude: -104.9903,
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
        }, // Denver
        {
          latitude: 34.0522,
          longitude: -118.2437,
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
        }, // LA
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(Date.now() - 75 * 60 * 1000),
        }, // SF
      ];

      const result = await service.detectLocationAnomalies(
        'user123',
        currentLocation,
        recentLocations,
      );

      expect(result.reasons).toContain(
        'Multiple rapid location changes detected',
      );
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should return low risk for normal travel patterns', async () => {
      const currentLocation = { latitude: 40.7589, longitude: -73.9851 }; // Times Square
      const recentLocations = [
        {
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
        }, // NYC Downtown
        {
          latitude: 40.7505,
          longitude: -73.9934,
          timestamp: new Date(Date.now() - 120 * 60 * 1000),
        }, // Midtown
      ];

      const result = await service.detectLocationAnomalies(
        'user123',
        currentLocation,
        recentLocations,
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.riskScore).toBeLessThan(25);
    });
  });

  describe('IP validation methods', () => {
    it('should correctly identify private IP addresses', () => {
      const privateIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'];
      const publicIPs = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];

      privateIPs.forEach((ip) => {
        expect(service['isPrivateIP'](ip)).toBe(true);
      });

      publicIPs.forEach((ip) => {
        expect(service['isPrivateIP'](ip)).toBe(false);
      });
    });

    it('should correctly identify reserved IP addresses', () => {
      const reservedIPs = [
        '0.0.0.0',
        '224.0.0.1',
        '240.0.0.1',
        '255.255.255.255',
      ];
      const normalIPs = ['8.8.8.8', '192.168.1.1', '10.0.0.1'];

      reservedIPs.forEach((ip) => {
        expect(service['isReservedIP'](ip)).toBe(true);
      });

      normalIPs.forEach((ip) => {
        expect(service['isReservedIP'](ip)).toBe(false);
      });
    });
  });

  describe('utility methods', () => {
    it('should convert degrees to radians correctly', () => {
      expect(service['toRadians'](0)).toBe(0);
      expect(service['toRadians'](90)).toBeCloseTo(Math.PI / 2);
      expect(service['toRadians'](180)).toBeCloseTo(Math.PI);
      expect(service['toRadians'](360)).toBeCloseTo(2 * Math.PI);
    });

    it('should calculate average distance correctly', () => {
      const currentLocation = { latitude: 0, longitude: 0 };
      const locations = [
        { latitude: 1, longitude: 0 },
        { latitude: 0, longitude: 1 },
        { latitude: -1, longitude: 0 },
        { latitude: 0, longitude: -1 },
      ];

      const avgDistance = service['calculateAverageDistance'](
        currentLocation,
        locations,
      );

      expect(avgDistance).toBeGreaterThan(110); // Approximately 111 km per degree
      expect(avgDistance).toBeLessThan(115);
    });

    it('should detect rapid location changes correctly', () => {
      const locations = [
        {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
        },
        {
          latitude: 2,
          longitude: 0,
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
        }, // ~220km in 30 min
        { latitude: 4, longitude: 0, timestamp: new Date() }, // ~220km in 30 min
      ];

      const rapidChanges = service['detectRapidLocationChanges'](locations);

      expect(rapidChanges).toBeGreaterThan(0);
    });
  });

  describe('recommendation generation', () => {
    it('should generate appropriate recommendations for Tor traffic', async () => {
      const result = await service.analyzeIP('185.220.101.1');

      expect(result.recommendations).toContain(
        'Block Tor traffic or require manual approval',
      );
      expect(result.recommendations).toContain(
        'Consider blocking this IP immediately',
      );
    });

    it('should generate appropriate recommendations for VPN traffic', async () => {
      const result = await service.analyzeIP('192.42.116.1');

      expect(result.recommendations).toContain(
        'Apply additional verification for VPN users',
      );
    });

    it('should generate minimal recommendations for normal traffic', async () => {
      const result = await service.analyzeIP('192.168.1.1');

      expect(result.recommendations.length).toBeLessThan(3);
    });
  });
});
