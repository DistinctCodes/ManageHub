import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiMonitorService } from './api-monitor.service';
import { ApiNotificationService } from './api-notification.service';
import {
  ApiEndpoint,
  EndpointStatus,
  HttpMethod,
  ApiProvider,
} from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';

describe('ApiMonitorService', () => {
  let service: ApiMonitorService;
  let endpointRepository: jest.Mocked<Repository<ApiEndpoint>>;
  let pingResultRepository: jest.Mocked<Repository<PingResult>>;
  let notificationService: jest.Mocked<ApiNotificationService>;

  const mockEndpoint: ApiEndpoint = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Endpoint',
    description: 'Test Description',
    url: 'https://api.example.com/test',
    method: HttpMethod.GET,
    provider: ApiProvider.CUSTOM,
    headers: {},
    body: null,
    timeoutMs: 30000,
    intervalSeconds: 300,
    retryAttempts: 3,
    retryDelayMs: 1000,
    expectedResponse: {
      statusCode: 200,
      contentType: 'application/json',
    },
    status: EndpointStatus.ACTIVE,
    isActive: true,
    enableAlerts: true,
    alertConfig: {
      consecutiveFailures: 3,
      responseTimeThresholdMs: 5000,
      emailNotifications: ['admin@example.com'],
    },
    tags: 'test,api',
    createdBy: 'test-user',
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastPingAt: null,
    nextPingAt: new Date(),
    pingResults: [],
    isHealthy: true,
    currentStatus: 'healthy',
    averageResponseTime: 100,
    uptimePercentage: 99.5,
    getNextPingTime: jest.fn().mockReturnValue(new Date(Date.now() + 300000)),
    shouldPing: jest.fn().mockReturnValue(true),
  };

  const mockPingResult: PingResult = {
    id: '456e7890-e89b-12d3-a456-426614174000',
    endpointId: mockEndpoint.id,
    status: PingStatus.SUCCESS,
    isSuccess: true,
    httpStatusCode: 200,
    responseTimeMs: 150,
    responseHeaders: null,
    responseBody: null,
    responseSize: null,
    errorMessage: null,
    errorDetails: null,
    isTimeout: false,
    validationResults: null,
    attemptNumber: 1,
    createdAt: new Date(),
    endpoint: mockEndpoint,
    performanceGrade: 'A',
    isHealthy: true,
    isDegraded: false,
    isDown: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiMonitorService,
        {
          provide: getRepositoryToken(ApiEndpoint),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findByIds: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              leftJoin: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
            }),
          },
        },
        {
          provide: getRepositoryToken(PingResult),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getManyAndCount: jest.fn(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
            }),
          },
        },
        {
          provide: ApiNotificationService,
          useValue: {
            handlePingResult: jest.fn(),
            cleanup: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiMonitorService>(ApiMonitorService);
    endpointRepository = module.get(getRepositoryToken(ApiEndpoint));
    pingResultRepository = module.get(getRepositoryToken(PingResult));
    notificationService = module.get(ApiNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performScheduledPings', () => {
    it('should perform scheduled pings for active endpoints', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEndpoint]),
      };

      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      endpointRepository.update.mockResolvedValue({ affected: 1 } as any);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      await service.performScheduledPings();

      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(endpointRepository.update).toHaveBeenCalled();
    });

    it('should log debug message when no endpoints need pinging', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.performScheduledPings();

      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(endpointRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors during scheduled pings', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Should not throw, but handle the error gracefully
      await expect(service.performScheduledPings()).resolves.not.toThrow();
    });
  });

  describe('performManualPing', () => {
    it('should perform manual ping successfully', async () => {
      const manualPingDto = {
        endpointId: mockEndpoint.id,
        saveResult: true,
        includeDetails: true,
      };

      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      const result = await service.performManualPing(manualPingDto);

      expect(endpointRepository.findOne).toHaveBeenCalledWith({
        where: { id: manualPingDto.endpointId },
      });
      expect(result).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        isSuccess: expect.any(Boolean),
      });
    });

    it('should throw error if endpoint not found for manual ping', async () => {
      const manualPingDto = {
        endpointId: 'non-existent-id',
        saveResult: true,
        includeDetails: true,
      };

      endpointRepository.findOne.mockResolvedValue(null);

      await expect(service.performManualPing(manualPingDto)).rejects.toThrow(
        'Endpoint not found',
      );
    });
  });

  describe('performBulkPing', () => {
    it('should perform bulk ping successfully', async () => {
      const bulkPingDto = {
        endpointIds: [mockEndpoint.id],
        saveResults: true,
        includeDetails: false,
      };

      endpointRepository.findByIds.mockResolvedValue([mockEndpoint]);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      const results = await service.performBulkPing(bulkPingDto);

      expect(endpointRepository.findByIds).toHaveBeenCalledWith(
        bulkPingDto.endpointIds,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
      });
    });

    it('should throw error if no valid endpoints found for bulk ping', async () => {
      const bulkPingDto = {
        endpointIds: ['non-existent-id'],
        saveResults: true,
        includeDetails: false,
      };

      endpointRepository.findByIds.mockResolvedValue([]);

      await expect(service.performBulkPing(bulkPingDto)).rejects.toThrow(
        'No valid endpoints found',
      );
    });
  });

  describe('pingSpecificEndpoint', () => {
    it('should ping specific endpoint successfully', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      const result = await service.pingSpecificEndpoint(mockEndpoint.id);

      expect(endpointRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEndpoint.id },
      });
      expect(result).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
      });
    });

    it('should throw error if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.pingSpecificEndpoint('non-existent-id'),
      ).rejects.toThrow('Endpoint not found');
    });
  });

  describe('bulkPing', () => {
    it('should perform bulk ping on endpoint IDs', async () => {
      endpointRepository.findByIds.mockResolvedValue([mockEndpoint]);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      const results = await service.bulkPing([mockEndpoint.id]);

      expect(endpointRepository.findByIds).toHaveBeenCalledWith([
        mockEndpoint.id,
      ]);
      expect(results).toHaveLength(1);
    });

    it('should throw error if no valid endpoints found', async () => {
      endpointRepository.findByIds.mockResolvedValue([]);

      await expect(service.bulkPing(['non-existent-id'])).rejects.toThrow(
        'No valid endpoints found',
      );
    });
  });

  describe('pingAllActiveEndpoints', () => {
    it('should ping all active endpoints', async () => {
      endpointRepository.find.mockResolvedValue([mockEndpoint]);
      endpointRepository.findByIds.mockResolvedValue([mockEndpoint]);
      pingResultRepository.create.mockReturnValue(mockPingResult);
      pingResultRepository.save.mockResolvedValue(mockPingResult);

      const results = await service.pingAllActiveEndpoints();

      expect(endpointRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: EndpointStatus.ACTIVE,
        },
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('getPingResults', () => {
    it('should return paginated ping results', async () => {
      const queryDto = {
        limit: 10,
        offset: 0,
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPingResult], 1]),
      };

      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPingResults(queryDto);

      expect(result).toMatchObject({
        results: [mockPingResult],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters when provided', async () => {
      const queryDto = {
        endpointId: mockEndpoint.id,
        status: PingStatus.SUCCESS,
        isSuccess: true,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPingResult], 1]),
      };

      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getPingResults(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'result.endpointId = :endpointId',
        { endpointId: queryDto.endpointId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'result.status = :status',
        { status: queryDto.status },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'result.isSuccess = :isSuccess',
        { isSuccess: queryDto.isSuccess },
      );
    });
  });

  describe('getPingResult', () => {
    it('should return a specific ping result by id', async () => {
      pingResultRepository.findOne.mockResolvedValue(mockPingResult);

      const result = await service.getPingResult(mockPingResult.id);

      expect(pingResultRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPingResult.id },
        relations: ['endpoint'],
      });
      expect(result).toEqual(mockPingResult);
    });

    it('should throw error if ping result not found', async () => {
      pingResultRepository.findOne.mockResolvedValue(null);

      await expect(service.getPingResult('non-existent-id')).rejects.toThrow(
        'Ping result not found',
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health overview', async () => {
      endpointRepository.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(4); // active

      endpointRepository.find.mockResolvedValue([
        { ...mockEndpoint, currentStatus: 'healthy' },
        { ...mockEndpoint, currentStatus: 'degraded' },
        { ...mockEndpoint, currentStatus: 'down' },
      ]);

      const result = await service.getSystemHealth();

      expect(result).toMatchObject({
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        totalEndpoints: 5,
        activeEndpoints: 4,
        healthyEndpoints: expect.any(Number),
        degradedEndpoints: expect.any(Number),
        downEndpoints: expect.any(Number),
        lastCheckAt: expect.any(Date),
      });
    });

    it('should classify system as unhealthy when many endpoints are down', async () => {
      endpointRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(10); // active

      // Mock 50% of endpoints as down (5 out of 10)
      const downEndpoints = Array(5).fill({
        ...mockEndpoint,
        currentStatus: 'down',
      });
      const healthyEndpoints = Array(5).fill({
        ...mockEndpoint,
        currentStatus: 'healthy',
      });

      endpointRepository.find.mockResolvedValue([
        ...downEndpoints,
        ...healthyEndpoints,
      ]);

      const result = await service.getSystemHealth();

      expect(result.status).toBe('unhealthy');
    });
  });

  describe('getEndpointHealth', () => {
    it('should return endpoint health details', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      pingResultRepository.findOne.mockResolvedValue(mockPingResult);

      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      pingResultRepository.count.mockResolvedValue(2);

      const result = await service.getEndpointHealth(mockEndpoint.id);

      expect(result).toMatchObject({
        endpoint: mockEndpoint,
        currentStatus: mockEndpoint.currentStatus,
        uptimePercentage: mockEndpoint.uptimePercentage,
        averageResponseTime: mockEndpoint.averageResponseTime,
        lastPingResult: mockPingResult,
        recentIncidents: 2,
      });
    });

    it('should throw error if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getEndpointHealth('non-existent-id'),
      ).rejects.toThrow('Endpoint not found');
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const analyticsDto = {
        period: '24h' as const,
        groupBy: 'hour' as const,
      };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPingResult]),
      };

      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAnalytics(analyticsDto);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getMonitoringStatus', () => {
    it('should return monitoring status', async () => {
      endpointRepository.count.mockResolvedValue(5);
      pingResultRepository.count.mockResolvedValue(100);

      const result = await service.getMonitoringStatus();

      expect(result).toMatchObject({
        isRunning: true,
        lastCheck: expect.any(Date),
        nextCheck: expect.any(Date),
        activeEndpoints: 5,
        totalPingsToday: 100,
        errors: expect.any(Array),
      });
    });
  });

  describe('monitoring control methods', () => {
    it('should start monitoring', async () => {
      const result = await service.startMonitoring();

      expect(result).toMatchObject({
        message: 'Monitoring service started successfully',
        status: 'started',
      });
    });

    it('should stop monitoring', async () => {
      const result = await service.stopMonitoring();

      expect(result).toMatchObject({
        message: 'Monitoring service stopped successfully',
        status: 'stopped',
      });
    });

    it('should restart monitoring', async () => {
      const result = await service.restartMonitoring();

      expect(result).toMatchObject({
        message: 'Monitoring service restarted successfully',
        status: 'restarted',
      });
    });
  });

  describe('isHealthy', () => {
    it('should return true when service is healthy', async () => {
      endpointRepository.count.mockResolvedValue(5);

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when database connection fails', async () => {
      endpointRepository.count.mockRejectedValue(
        new Error('Database connection error'),
      );

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});
