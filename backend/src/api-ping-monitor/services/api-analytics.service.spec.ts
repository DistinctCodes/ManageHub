import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { 
  ApiAnalyticsService, 
  UptimeMetrics, 
  PerformanceMetrics,
  IncidentMetrics,
  GlobalMetrics,
  SLAReport
} from './api-analytics.service';
import { ApiEndpoint, EndpointStatus, HttpMethod, ApiProvider } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';

describe('ApiAnalyticsService', () => {
  let service: ApiAnalyticsService;
  let endpointRepository: jest.Mocked<Repository<ApiEndpoint>>;
  let pingResultRepository: jest.Mocked<Repository<PingResult>>;

  const mockEndpoint: ApiEndpoint = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Endpoint',
    description: 'Test Description',
    url: 'https://api.example.com/test',
    method: HttpMethod.GET,
    provider: ApiProvider.STRIPE,
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
      uptimeThreshold: 95,
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
    getNextPingTime: jest.fn(),
    shouldPing: jest.fn(),
  };

  const mockPingResults: PingResult[] = [
    {
      id: 'result-1',
      endpointId: mockEndpoint.id,
      status: PingStatus.SUCCESS,
      httpStatusCode: 200,
      responseTimeMs: 150,
      responseHeaders: '{}',
      responseBody: 'OK',
      responseSize: 2,
      isSuccess: true,
      isTimeout: false,
      errorMessage: null,
      errorDetails: null,
      validationResults: null,
      attemptNumber: 1,
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      endpoint: mockEndpoint,
    },
    {
      id: 'result-2',
      endpointId: mockEndpoint.id,
      status: PingStatus.SUCCESS,
      httpStatusCode: 200,
      responseTimeMs: 200,
      responseHeaders: '{}',
      responseBody: 'OK',
      responseSize: 2,
      isSuccess: true,
      isTimeout: false,
      errorMessage: null,
      errorDetails: null,
      validationResults: null,
      attemptNumber: 1,
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      endpoint: mockEndpoint,
    },
    {
      id: 'result-3',
      endpointId: mockEndpoint.id,
      status: PingStatus.TIMEOUT,
      httpStatusCode: null,
      responseTimeMs: null,
      responseHeaders: null,
      responseBody: null,
      responseSize: null,
      isSuccess: false,
      isTimeout: true,
      errorMessage: 'Request timeout',
      errorDetails: '{"code": "ECONNABORTED"}',
      validationResults: null,
      attemptNumber: 1,
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      endpoint: mockEndpoint,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiAnalyticsService,
        {
          provide: getRepositoryToken(ApiEndpoint),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            }),
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PingResult),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            }),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiAnalyticsService>(ApiAnalyticsService);
    endpointRepository = module.get(getRepositoryToken(ApiEndpoint));
    pingResultRepository = module.get(getRepositoryToken(PingResult));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUptimeMetrics', () => {
    it('should return uptime metrics for all endpoints', async () => {
      const endpointWithResults = { ...mockEndpoint, pingResults: mockPingResults };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([endpointWithResults]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUptimeMetrics();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        url: mockEndpoint.url,
        provider: mockEndpoint.provider,
        totalChecks: 3,
        successfulChecks: 2,
        failedChecks: 1,
        uptimePercentage: expect.closeTo(66.67, 2),
      });
    });

    it('should return uptime metrics for specific endpoint', async () => {
      const endpointWithResults = { ...mockEndpoint, pingResults: mockPingResults };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([endpointWithResults]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUptimeMetrics(mockEndpoint.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('endpoint.id = :endpointId', { 
        endpointId: mockEndpoint.id 
      });
      expect(result).toHaveLength(1);
    });

    it('should handle different time periods', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUptimeMetrics(undefined, '7d');

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'endpoint.pingResults', 
        'result', 
        'result.createdAt >= :startDate', 
        { startDate: expect.any(Date) }
      );
    });

    it('should handle endpoints with no ping results', async () => {
      const endpointWithoutResults = { ...mockEndpoint, pingResults: [] };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([endpointWithoutResults]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUptimeMetrics();

      expect(result[0]).toMatchObject({
        uptimePercentage: 100,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for successful requests', async () => {
      const successfulResults = mockPingResults.filter(r => r.isSuccess);
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(successfulResults),
      };
      
      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPerformanceMetrics();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        endpointId: mockEndpoint.id,
        responseTime: {
          average: 175, // (150 + 200) / 2
          min: 150,
          max: 200,
          median: 200,
        },
        throughput: {
          requestsPerHour: expect.any(Number),
          requestsPerDay: expect.any(Number),
        },
        errorRate: 0,
        availability: 100,
      });
    });

    it('should filter by endpoint ID when provided', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      
      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getPerformanceMetrics(mockEndpoint.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('endpoint.id = :endpointId', { 
        endpointId: mockEndpoint.id 
      });
    });

    it('should handle empty results gracefully', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      
      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPerformanceMetrics();

      expect(result).toEqual([]);
    });
  });

  describe('getIncidentMetrics', () => {
    it('should return incident metrics for endpoints with failures', async () => {
      const failedResults = mockPingResults.filter(r => !r.isSuccess);
      const endpointWithFailures = { ...mockEndpoint, pingResults: failedResults };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([endpointWithFailures]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncidentMetrics();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        totalIncidents: 1,
        totalDowntime: 5, // 1 incident * 5 minutes
        incidentsByType: {
          [PingStatus.TIMEOUT]: 1,
        },
      });
    });

    it('should filter by endpoint ID when provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getIncidentMetrics(mockEndpoint.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('endpoint.id = :endpointId', { 
        endpointId: mockEndpoint.id 
      });
    });

    it('should handle endpoints with no incidents', async () => {
      const endpointWithoutIncidents = { ...mockEndpoint, pingResults: [] };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([endpointWithoutIncidents]),
      };
      
      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncidentMetrics();

      expect(result[0]).toMatchObject({
        totalIncidents: 0,
        totalDowntime: 0,
        averageIncidentDuration: 0,
      });
    });
  });

  describe('getComparisonMetrics', () => {
    it('should return comparison between current and previous periods', async () => {
      const mockUptimeMetrics: UptimeMetrics = {
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        url: mockEndpoint.url,
        provider: mockEndpoint.provider,
        uptimePercentage: 99.5,
        totalChecks: 100,
        successfulChecks: 99,
        failedChecks: 1,
        averageResponseTime: 150,
        minResponseTime: 100,
        maxResponseTime: 200,
        lastCheckTime: new Date(),
        meanTimeToRecovery: 5,
        meanTimeBetweenFailures: 1440,
      };

      const previousMetrics = {
        ...mockUptimeMetrics,
        uptimePercentage: 98.0,
        averageResponseTime: 200,
        totalChecks: 50,
        failedChecks: 1,
      };

      jest.spyOn(service, 'getUptimeMetrics')
        .mockResolvedValueOnce([mockUptimeMetrics])
        .mockResolvedValueOnce([previousMetrics]);

      const result = await service.getComparisonMetrics(mockEndpoint.id);

      expect(result).toMatchObject({
        current: mockUptimeMetrics,
        previous: previousMetrics,
        change: {
          uptimePercentage: 1.5, // 99.5 - 98.0
          averageResponseTime: -50, // 150 - 200
          totalChecks: 50, // 100 - 50
          errorRate: expect.any(Number),
        },
      });
    });

    it('should use default periods when not specified', async () => {
      const getUptimeMetricsSpy = jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue([]);

      await service.getComparisonMetrics(mockEndpoint.id);

      expect(getUptimeMetricsSpy).toHaveBeenCalledTimes(2);
      expect(getUptimeMetricsSpy).toHaveBeenNthCalledWith(1, mockEndpoint.id, '24h');
      expect(getUptimeMetricsSpy).toHaveBeenNthCalledWith(2, mockEndpoint.id, '24h');
    });
  });

  describe('getGlobalMetrics', () => {
    it('should return comprehensive global metrics', async () => {
      const mockUptimeMetrics: UptimeMetrics[] = [
        {
          endpointId: 'endpoint-1',
          endpointName: 'Endpoint 1',
          url: 'https://api1.example.com',
          provider: 'stripe',
          uptimePercentage: 99.5,
          totalChecks: 100,
          successfulChecks: 99,
          failedChecks: 1,
          averageResponseTime: 150,
          minResponseTime: 100,
          maxResponseTime: 200,
          lastCheckTime: new Date(),
          meanTimeToRecovery: 5,
          meanTimeBetweenFailures: 1440,
        },
        {
          endpointId: 'endpoint-2',
          endpointName: 'Endpoint 2',
          url: 'https://api2.example.com',
          provider: 'google',
          uptimePercentage: 95.0,
          totalChecks: 100,
          successfulChecks: 95,
          failedChecks: 5,
          averageResponseTime: 300,
          minResponseTime: 200,
          maxResponseTime: 500,
          lastCheckTime: new Date(),
          meanTimeToRecovery: 10,
          meanTimeBetweenFailures: 720,
        },
      ];

      endpointRepository.count
        .mockResolvedValueOnce(10) // total endpoints
        .mockResolvedValueOnce(8); // active endpoints

      jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue(mockUptimeMetrics);
      jest.spyOn(service as any, 'calculateTrends').mockResolvedValue({
        uptimeTrend: [],
        responseTimeTrend: [],
        incidentTrend: [],
      });

      pingResultRepository.count
        .mockResolvedValueOnce(500) // total checks today
        .mockResolvedValueOnce(25); // total incidents today

      const result = await service.getGlobalMetrics();

      expect(result).toMatchObject({
        overview: {
          totalEndpoints: 10,
          activeEndpoints: 8,
          healthyEndpoints: 1, // uptimePercentage >= 99
          degradedEndpoints: 1, // uptimePercentage >= 95 but < 99
          downEndpoints: 0,
          averageUptime: 97.25, // (99.5 + 95.0) / 2
          averageResponseTime: 225, // (150 + 300) / 2
          totalChecksToday: 500,
          totalIncidentsToday: 25,
        },
        trends: expect.any(Object),
        topPerformers: expect.arrayContaining([
          expect.objectContaining({ uptimePercentage: 99.5 }),
        ]),
        worstPerformers: expect.arrayContaining([
          expect.objectContaining({ uptimePercentage: 95.0 }),
        ]),
      });
    });

    it('should handle empty metrics gracefully', async () => {
      endpointRepository.count.mockResolvedValue(0);
      jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue([]);
      jest.spyOn(service as any, 'calculateTrends').mockResolvedValue({
        uptimeTrend: [],
        responseTimeTrend: [],
        incidentTrend: [],
      });
      pingResultRepository.count.mockResolvedValue(0);

      const result = await service.getGlobalMetrics();

      expect(result.overview).toMatchObject({
        totalEndpoints: 0,
        activeEndpoints: 0,
        averageUptime: 100,
        averageResponseTime: 0,
      });
    });
  });

  describe('generateSLAReport', () => {
    it('should generate SLA report with correct status', async () => {
      const mockUptimeMetrics: UptimeMetrics[] = [
        {
          endpointId: mockEndpoint.id,
          endpointName: mockEndpoint.name,
          url: mockEndpoint.url,
          provider: mockEndpoint.provider,
          uptimePercentage: 99.95,
          totalChecks: 1000,
          successfulChecks: 999,
          failedChecks: 1,
          averageResponseTime: 150,
          minResponseTime: 100,
          maxResponseTime: 200,
          lastCheckTime: new Date(),
          meanTimeToRecovery: 5,
          meanTimeBetweenFailures: 1440,
        },
      ];

      jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue(mockUptimeMetrics);
      jest.spyOn(service as any, 'calculateSLAStatus').mockReturnValue('met');
      jest.spyOn(service as any, 'calculateRemainingErrorBudget').mockReturnValue(80);
      jest.spyOn(service as any, 'projectUptime').mockReturnValue(99.95);

      const result = await service.generateSLAReport();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        slaTarget: 99.9,
        currentUptime: 99.95,
        slaStatus: 'met',
        remainingErrorBudget: 80,
        projectedUptime: 99.95,
      });
    });

    it('should filter by endpoint ID when provided', async () => {
      const getUptimeMetricsSpy = jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue([]);

      await service.generateSLAReport(mockEndpoint.id);

      expect(getUptimeMetricsSpy).toHaveBeenCalledWith(mockEndpoint.id, '30d');
    });

    it('should use custom SLA target and period', async () => {
      const getUptimeMetricsSpy = jest.spyOn(service, 'getUptimeMetrics').mockResolvedValue([]);

      await service.generateSLAReport(undefined, 99.95, '90d');

      expect(getUptimeMetricsSpy).toHaveBeenCalledWith(undefined, '90d');
    });
  });

  describe('generateCustomReport', () => {
    it('should generate custom report with specified options', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPingResults),
      };
      
      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jest.spyOn(service as any, 'processCustomReportData').mockReturnValue({
        summary: 'Custom report',
        data: mockPingResults,
      });

      const options = {
        endpointIds: [mockEndpoint.id],
        providers: ['stripe'],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        includeMetrics: ['uptime', 'performance'] as any,
        groupBy: 'endpoint' as any,
      };

      const result = await service.generateCustomReport(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('endpoint.id IN (:...endpointIds)', { 
        endpointIds: options.endpointIds 
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('endpoint.provider IN (:...providers)', { 
        providers: options.providers 
      });
      expect(result).toMatchObject({
        summary: 'Custom report',
        data: mockPingResults,
      });
    });

    it('should handle optional filters', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      
      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jest.spyOn(service as any, 'processCustomReportData').mockReturnValue({});

      const options = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        includeMetrics: ['uptime'] as any,
        groupBy: 'day' as any,
      };

      await service.generateCustomReport(options);

      // Should not call andWhere for optional filters
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('endpointIds'),
        expect.any(Object)
      );
    });
  });

  describe('helper methods', () => {
    describe('getStartDate', () => {
      it('should return correct start dates for different periods', () => {
        const now = new Date();
        
        const oneHourAgo = service['getStartDate']('1h');
        const oneDayAgo = service['getStartDate']('24h');
        const oneWeekAgo = service['getStartDate']('7d');
        const oneMonthAgo = service['getStartDate']('30d');
        
        expect(oneHourAgo.getTime()).toBeCloseTo(now.getTime() - 60 * 60 * 1000, -10000);
        expect(oneDayAgo.getTime()).toBeCloseTo(now.getTime() - 24 * 60 * 60 * 1000, -10000);
        expect(oneWeekAgo.getTime()).toBeCloseTo(now.getTime() - 7 * 24 * 60 * 60 * 1000, -10000);
        expect(oneMonthAgo.getTime()).toBeCloseTo(now.getTime() - 30 * 24 * 60 * 60 * 1000, -10000);
      });

      it('should default to 24h for unknown periods', () => {
        const result = service['getStartDate']('unknown' as any);
        const expected = service['getStartDate']('24h');
        
        expect(result.getTime()).toBeCloseTo(expected.getTime(), -1000);
      });
    });

    describe('getPeriodHours', () => {
      it('should return correct hours for different periods', () => {
        expect(service['getPeriodHours']('1h')).toBe(1);
        expect(service['getPeriodHours']('24h')).toBe(24);
        expect(service['getPeriodHours']('7d')).toBe(24 * 7);
        expect(service['getPeriodHours']('30d')).toBe(24 * 30);
        expect(service['getPeriodHours']('unknown' as any)).toBe(24);
      });
    });

    describe('calculateSLAStatus', () => {
      it('should return correct SLA status', () => {
        expect(service['calculateSLAStatus'](99.95, 99.9)).toBe('met');
        expect(service['calculateSLAStatus'](99.5, 99.9)).toBe('at_risk');
        expect(service['calculateSLAStatus'](99.0, 99.9)).toBe('breached');
      });
    });

    describe('calculateRemainingErrorBudget', () => {
      it('should calculate remaining error budget correctly', () => {
        const result = service['calculateRemainingErrorBudget'](99.0, 99.9, 1000);
        
        // With 99.0% uptime and 99.9% target:
        // Allowed failures: 1000 * (1 - 0.999) = 1
        // Actual failures: 1000 * (1 - 0.99) = 10
        // Remaining failures: max(0, 1 - 10) = 0
        // Remaining budget: 0 / 1000 * 100 = 0%
        expect(result).toBe(0);
      });

      it('should handle case with remaining budget', () => {
        const result = service['calculateRemainingErrorBudget'](99.95, 99.9, 1000);
        
        // With 99.95% uptime and 99.9% target:
        // Allowed failures: 1000 * (1 - 0.999) = 1
        // Actual failures: 1000 * (1 - 0.9995) = 0.5 = 0 (floored)
        // Remaining failures: max(0, 1 - 0) = 1
        // Remaining budget: 1 / 1000 * 100 = 0.1%
        expect(result).toBe(0.1);
      });
    });

    describe('groupResultsByEndpoint', () => {
      it('should group ping results by endpoint ID', () => {
        const results = [
          { ...mockPingResults[0], endpointId: 'endpoint-1' },
          { ...mockPingResults[1], endpointId: 'endpoint-1' },
          { ...mockPingResults[2], endpointId: 'endpoint-2' },
        ];

        const grouped = service['groupResultsByEndpoint'](results);

        expect(grouped).toHaveProperty('endpoint-1');
        expect(grouped).toHaveProperty('endpoint-2');
        expect(grouped['endpoint-1']).toHaveLength(2);
        expect(grouped['endpoint-2']).toHaveLength(1);
      });
    });
  });
});