import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceTracker, DeviceType, DeviceStatus, RiskLevel } from './entities/device-tracker.entity';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { DeviceRiskAssessmentService } from './services/device-risk-assessment.service';
import { GeolocationService } from './services/geolocation.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DeviceTrackerService', () => {
  let service: DeviceTrackerService;
  let repository: Repository<DeviceTracker>;
  let riskAssessmentService: DeviceRiskAssessmentService;
  let geolocationService: GeolocationService;
  let anomalyDetectionService: DeviceAnomalyDetectionService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn(),
    update: jest.fn(),
  };

  const mockRiskAssessmentService = {
    assessSecurityFlags: jest.fn(),
    calculateRiskScore: jest.fn(),
  };

  const mockGeolocationService = {
    updateDeviceGeolocation: jest.fn(),
    analyzeIP: jest.fn(),
  };

  const mockAnomalyDetectionService = {
    detectUserAnomalies: jest.fn(),
    getDeviceAnomalies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTrackerService,
        {
          provide: getRepositoryToken(DeviceTracker),
          useValue: mockRepository,
        },
        {
          provide: DeviceRiskAssessmentService,
          useValue: mockRiskAssessmentService,
        },
        {
          provide: GeolocationService,
          useValue: mockGeolocationService,
        },
        {
          provide: DeviceAnomalyDetectionService,
          useValue: mockAnomalyDetectionService,
        },
      ],
    }).compile();

    service = module.get<DeviceTrackerService>(DeviceTrackerService);
    repository = module.get<Repository<DeviceTracker>>(getRepositoryToken(DeviceTracker));
    riskAssessmentService = module.get<DeviceRiskAssessmentService>(DeviceRiskAssessmentService);
    geolocationService = module.get<GeolocationService>(GeolocationService);
    anomalyDetectionService = module.get<DeviceAnomalyDetectionService>(DeviceAnomalyDetectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a device tracker entry with risk assessment', async () => {
      const createDto: CreateDeviceTrackerDto = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
        location: 'New York, USA',
        userId: 'user123',
      };

      const enhancedData = {
        ...createDto,
        countryCode: 'US',
        city: 'New York',
        isVpn: false,
      };

      const securityFlags = {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isNewLocation: true,
        isNewDevice: true,
        hasHighFailedAttempts: false,
        isSuspiciousUserAgent: false,
      };

      const riskAssessment = {
        riskScore: 25,
        riskLevel: RiskLevel.LOW,
        riskFactors: ['New device detected'],
        recommendations: ['Verify device'],
        shouldBlock: false,
      };

      const mockDevice = {
        id: 'device-123',
        ...enhancedData,
        riskScore: 25,
        riskLevel: RiskLevel.LOW,
        status: DeviceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGeolocationService.updateDeviceGeolocation.mockResolvedValue(enhancedData);
      mockRepository.find.mockResolvedValue([]);
      mockRiskAssessmentService.assessSecurityFlags.mockReturnValue(securityFlags);
      mockRiskAssessmentService.calculateRiskScore.mockReturnValue(riskAssessment);
      mockRepository.create.mockReturnValue(mockDevice);
      mockRepository.save.mockResolvedValue(mockDevice);
      mockAnomalyDetectionService.detectUserAnomalies.mockResolvedValue([]);

      const result = await service.create(createDto);

      expect(mockGeolocationService.updateDeviceGeolocation).toHaveBeenCalledWith(createDto);
      expect(mockRiskAssessmentService.assessSecurityFlags).toHaveBeenCalled();
      expect(mockRiskAssessmentService.calculateRiskScore).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockDevice);
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDto: CreateDeviceTrackerDto = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
      };

      mockGeolocationService.updateDeviceGeolocation.mockResolvedValue(createDto);
      mockRepository.find.mockResolvedValue([]);
      mockRiskAssessmentService.assessSecurityFlags.mockReturnValue({});
      mockRiskAssessmentService.calculateRiskScore.mockReturnValue({
        riskScore: 0,
        riskLevel: RiskLevel.LOW,
        shouldBlock: false,
      });
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a device tracker entry', async () => {
      const mockDevice = {
        id: 'device-123',
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
        userId: 'user123',
      };

      mockRepository.findOne.mockResolvedValue(mockDevice);

      const result = await service.findOne('device-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'device-123' },
      });
      expect(result).toEqual(mockDevice);
    });

    it('should throw NotFoundException when device not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('blockDevice', () => {
    it('should block a device with reason', async () => {
      const mockDevice = {
        id: 'device-123',
        status: DeviceStatus.ACTIVE,
        riskLevel: RiskLevel.LOW,
      };

      const expectedBlockedDevice = {
        ...mockDevice,
        status: DeviceStatus.BLOCKED,
        riskLevel: RiskLevel.CRITICAL,
        blockedAt: expect.any(Date),
        blockedReason: 'Security violation',
        blockedBy: 'admin',
      };

      mockRepository.findOne.mockResolvedValue(mockDevice);
      mockRepository.save.mockResolvedValue(expectedBlockedDevice);

      const result = await service.blockDevice('device-123', 'Security violation', 'admin');

      expect(result.status).toBe(DeviceStatus.BLOCKED);
      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(result.blockedReason).toBe('Security violation');
      expect(result.blockedBy).toBe('admin');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempts counter', async () => {
      await service.recordFailedAttempt('device-123');

      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: 'device-123' },
        'failedAttempts',
        1,
      );
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed attempts and update login info', async () => {
      await service.recordSuccessfulLogin('device-123');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'device-123' },
        {
          lastLoginAt: expect.any(Date),
          failedAttempts: 0,
        },
      );
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: 'device-123' },
        'loginCount',
        1,
      );
    });
  });

  describe('getSuspiciousDevices', () => {
    it('should return devices with suspicious activity', async () => {
      const mockSuspiciousDevices = [
        {
          id: 'device-1',
          status: DeviceStatus.SUSPICIOUS,
          riskScore: 60,
        },
        {
          id: 'device-2',
          riskLevel: RiskLevel.HIGH,
          isVpn: true,
        },
      ];

      mockRepository.find.mockResolvedValue(mockSuspiciousDevices);

      const result = await service.getSuspiciousDevices();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: [
          { status: DeviceStatus.SUSPICIOUS },
          { riskLevel: RiskLevel.HIGH },
          { riskLevel: RiskLevel.CRITICAL },
          { isVpn: true },
          { isTor: true },
        ],
        order: { riskScore: 'DESC' },
      });
      expect(result).toEqual(mockSuspiciousDevices);
    });
  });
});