import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceTracker, DeviceType } from './entities/device-tracker.entity';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DeviceTrackerService', () => {
  let service: DeviceTrackerService;
  let repository: Repository<DeviceTracker>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTrackerService,
        {
          provide: getRepositoryToken(DeviceTracker),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DeviceTrackerService>(DeviceTrackerService);
    repository = module.get<Repository<DeviceTracker>>(getRepositoryToken(DeviceTracker));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a device tracker entry', async () => {
      const createDto: CreateDeviceTrackerDto = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
        location: 'New York, USA',
        userId: 'user123',
      };

      const mockDeviceTracker = {
        id: 'device-123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockDeviceTracker);
      mockRepository.save.mockResolvedValue(mockDeviceTracker);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockDeviceTracker);
      expect(result).toEqual(mockDeviceTracker);
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDto: CreateDeviceTrackerDto = {
        deviceType: DeviceType.DESKTOP,
        ipAddress: '192.168.1.1',
      };

      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a device tracker entry', async () => {
      const mockDeviceTracker = {
        id: 'device-123',
        deviceType: 'Desktop',
        ipAddress: '192.168.1.1',
      };

      mockRepository.findOne.mockResolvedValue(mockDeviceTracker);

      const result = await service.findOne('device-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'device-123' },
      });
      expect(result).toEqual(mockDeviceTracker);
    });

    it('should throw NotFoundException when device tracker not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('should return device trackers for a user', async () => {
      const mockDeviceTrackers = [
        {
          id: 'device-1',
          userId: 'user123',
          deviceType: 'Desktop',
          ipAddress: '192.168.1.1',
        },
        {
          id: 'device-2',
          userId: 'user123',
          deviceType: 'Mobile',
          ipAddress: '192.168.1.2',
        },
      ];

      mockRepository.find.mockResolvedValue(mockDeviceTrackers);

      const result = await service.findByUserId('user123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        order: { lastSeenAt: 'DESC' },
      });
      expect(result).toEqual(mockDeviceTrackers);
    });
  });

  describe('markAsTrusted', () => {
    it('should mark a device as trusted', async () => {
      const mockDeviceTracker = {
        id: 'device-123',
        isTrusted: false,
        deviceType: 'Desktop',
        ipAddress: '192.168.1.1',
      };

      const updatedDeviceTracker = {
        ...mockDeviceTracker,
        isTrusted: true,
      };

      mockRepository.findOne.mockResolvedValue(mockDeviceTracker);
      mockRepository.save.mockResolvedValue(updatedDeviceTracker);

      const result = await service.markAsTrusted('device-123');

      expect(result.isTrusted).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getDeviceStatistics', () => {
    it('should return device statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(100) // total devices
        .mockResolvedValueOnce(80); // trusted devices

      const mockDeviceTypeBreakdown = [
        { deviceType: 'Desktop', count: '60' },
        { deviceType: 'Mobile', count: '40' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockDeviceTypeBreakdown),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getDeviceStatistics();

      expect(result.totalDevices).toBe(100);
      expect(result.trustedDevices).toBe(80);
      expect(result.untrustedDevices).toBe(20);
      expect(result.deviceTypeBreakdown).toEqual([
        { deviceType: 'Desktop', count: 60 },
        { deviceType: 'Mobile', count: 40 },
      ]);
    });
  });
});