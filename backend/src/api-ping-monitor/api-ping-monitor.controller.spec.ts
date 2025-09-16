import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidationPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiPingMonitorController } from './api-ping-monitor.controller';
import { ApiEndpointService } from './services/api-endpoint.service';
import { ApiMonitorService } from './services/api-monitor.service';
import { ApiAnalyticsService } from './services/api-analytics.service';
import {
  CreateApiEndpointDto,
  UpdateApiEndpointDto,
  ApiEndpointQueryDto,
  BulkUpdateEndpointsDto,
} from './dto/api-endpoint.dto';
import {
  ManualPingDto,
  BulkPingDto,
  PingResultQueryDto,
} from './dto/ping-result.dto';
import {
  ApiEndpoint,
  EndpointStatus,
  HttpMethod,
  ApiProvider,
} from './entities/api-endpoint.entity';
import { PingResult, PingStatus } from './entities/ping-result.entity';

describe('ApiPingMonitorController', () => {
  let controller: ApiPingMonitorController;
  let endpointService: jest.Mocked<ApiEndpointService>;
  let monitorService: jest.Mocked<ApiMonitorService>;
  let analyticsService: jest.Mocked<ApiAnalyticsService>;

  const mockEndpoint: ApiEndpoint = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Endpoint',
    description: 'Test endpoint description',
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
    get isHealthy() {
      return true;
    },
    get currentStatus() {
      return 'healthy' as const;
    },
    get averageResponseTime() {
      return 100;
    },
    get uptimePercentage() {
      return 99.5;
    },
    getNextPingTime: jest.fn(),
    shouldPing: jest.fn(),
  };

  const mockPingResult: PingResult = {
    id: 'ping-result-1',
    endpointId: mockEndpoint.id,
    status: PingStatus.SUCCESS,
    httpStatusCode: 200,
    responseTimeMs: 150,
    dnsLookupTimeMs: 10,
    tcpConnectionTimeMs: 20,
    tlsHandshakeTimeMs: 30,
    firstByteTimeMs: 40,
    contentTransferTimeMs: 50,
    responseHeaders: '{}',
    responseBody: 'OK',
    responseSize: 2,
    errorMessage: null,
    errorDetails: null,
    isSuccess: true,
    isTimeout: false,
    alertSent: false,
    attemptNumber: 1,
    validationResults: null,
    metadata: null,
    createdAt: new Date(),
    endpoint: mockEndpoint,
    get isHealthy() {
      return true;
    },
    get performanceGrade() {
      return 'A' as const;
    },
    get statusCategory() {
      return 'success' as const;
    },
    getFormattedResponseTime: () => '150ms',
    getErrorSummary: () => 'Success',
    hasPerformanceIssue: () => false,
    toSummary: () => ({
      id: 'ping-result-1',
      status: PingStatus.SUCCESS,
      isSuccess: true,
      responseTimeMs: 150,
      httpStatusCode: 200,
      errorMessage: 'Success',
      createdAt: new Date(),
      performanceGrade: 'A',
    }),
  };

  beforeEach(async () => {
    const mockEndpointService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      bulkUpdate: jest.fn(),
      toggleStatus: jest.fn(),
      toggleActive: jest.fn(),
      getEndpointsByProvider: jest.fn(),
      createPresetEndpoints: jest.fn(),
      getEndpointHistory: jest.fn(),
      getEndpointStatistics: jest.fn(),
    };

    const mockMonitorService = {
      pingSpecificEndpoint: jest.fn(),
      bulkPing: jest.fn(),
      pingAllActiveEndpoints: jest.fn(),
      getPingResults: jest.fn(),
      getPingResult: jest.fn(),
      getEndpointPingResults: jest.fn(),
    };

    const mockAnalyticsService = {
      getUptimeMetrics: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      getIncidentMetrics: jest.fn(),
      getComparisonMetrics: jest.fn(),
      getGlobalMetrics: jest.fn(),
      generateSLAReport: jest.fn(),
      generateCustomReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiPingMonitorController],
      providers: [
        { provide: ApiEndpointService, useValue: mockEndpointService },
        { provide: ApiMonitorService, useValue: mockMonitorService },
        { provide: ApiAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<ApiPingMonitorController>(ApiPingMonitorController);
    endpointService = module.get(ApiEndpointService);
    monitorService = module.get(ApiMonitorService);
    analyticsService = module.get(ApiAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Endpoint Management', () => {
    describe('createEndpoint', () => {
      it('should create a new endpoint successfully', async () => {
        const createEndpointDto: CreateApiEndpointDto = {
          name: 'Test Endpoint',
          description: 'Test endpoint description',
          url: 'https://api.example.com/test',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'test-user',
        };

        endpointService.create.mockResolvedValue(mockEndpoint);

        const result = await controller.createEndpoint(createEndpointDto);

        expect(endpointService.create).toHaveBeenCalledWith(createEndpointDto);
        expect(result).toEqual(mockEndpoint);
      });

      it('should handle validation errors', async () => {
        const invalidDto = {} as CreateApiEndpointDto;
        endpointService.create.mockRejectedValue(
          new BadRequestException('Validation failed'),
        );

        await expect(controller.createEndpoint(invalidDto)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('getEndpoints', () => {
      it('should retrieve endpoints with pagination', async () => {
        const queryDto: ApiEndpointQueryDto = {
          limit: 10,
          offset: 0,
          search: 'test',
        };
        const paginatedResult = {
          endpoints: [mockEndpoint],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        endpointService.findAll.mockResolvedValue(paginatedResult);

        const result = await controller.getEndpoints(queryDto);

        expect(endpointService.findAll).toHaveBeenCalledWith(queryDto);
        expect(result).toEqual(paginatedResult);
      });

      it('should handle empty query parameters', async () => {
        const emptyQuery = {};
        endpointService.findAll.mockResolvedValue({
          endpoints: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        });

        const result = await controller.getEndpoints(emptyQuery);

        expect(endpointService.findAll).toHaveBeenCalledWith(emptyQuery);
        expect(result.endpoints).toHaveLength(0);
      });
    });

    describe('getEndpoint', () => {
      it('should retrieve a specific endpoint by ID', async () => {
        endpointService.findOne.mockResolvedValue(mockEndpoint);

        const result = await controller.getEndpoint(mockEndpoint.id);

        expect(endpointService.findOne).toHaveBeenCalledWith(mockEndpoint.id);
        expect(result).toEqual(mockEndpoint);
      });

      it('should handle endpoint not found', async () => {
        endpointService.findOne.mockRejectedValue(
          new NotFoundException('Endpoint not found'),
        );

        await expect(controller.getEndpoint('non-existent-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('updateEndpoint', () => {
      it('should update an endpoint successfully', async () => {
        const updateDto: UpdateApiEndpointDto = {
          name: 'Updated Endpoint',
          description: 'Updated description',
        };
        const updatedEndpoint = {
          ...mockEndpoint,
          ...updateDto,
          get isHealthy() {
            return true;
          },
          get currentStatus() {
            return 'healthy' as const;
          },
          get averageResponseTime() {
            return 100;
          },
          get uptimePercentage() {
            return 99.5;
          },
          getNextPingTime: jest.fn(),
          shouldPing: jest.fn(),
        };

        endpointService.update.mockResolvedValue(updatedEndpoint);

        const result = await controller.updateEndpoint(
          mockEndpoint.id,
          updateDto,
        );

        expect(endpointService.update).toHaveBeenCalledWith(
          mockEndpoint.id,
          updateDto,
        );
        expect(result.name).toBe(updateDto.name);
      });

      it('should handle update validation errors', async () => {
        const invalidDto = { url: 'invalid-url' } as UpdateApiEndpointDto;
        endpointService.update.mockRejectedValue(
          new BadRequestException('Invalid URL'),
        );

        await expect(
          controller.updateEndpoint(mockEndpoint.id, invalidDto),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteEndpoint', () => {
      it('should delete an endpoint successfully', async () => {
        endpointService.remove.mockResolvedValue(undefined);

        await controller.deleteEndpoint(mockEndpoint.id);

        expect(endpointService.remove).toHaveBeenCalledWith(mockEndpoint.id);
      });

      it('should handle deletion of non-existent endpoint', async () => {
        endpointService.remove.mockRejectedValue(
          new NotFoundException('Endpoint not found'),
        );

        await expect(
          controller.deleteEndpoint('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('bulkUpdateEndpoints', () => {
      it('should perform bulk update successfully', async () => {
        const bulkUpdateDto: BulkUpdateEndpointsDto = {
          endpointIds: [mockEndpoint.id],
          updatedBy: 'test-user',
          status: EndpointStatus.PAUSED,
        };
        const bulkResult = { updated: 1, errors: [] };

        endpointService.bulkUpdate.mockResolvedValue(bulkResult);

        const result = await controller.bulkUpdateEndpoints(bulkUpdateDto);

        expect(endpointService.bulkUpdate).toHaveBeenCalledWith(bulkUpdateDto);
        expect(result.updated).toBe(1);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle bulk update with errors', async () => {
        const bulkUpdateDto: BulkUpdateEndpointsDto = {
          endpointIds: ['invalid-id'],
          updatedBy: 'test-user',
          status: EndpointStatus.PAUSED,
        };
        const bulkResult = {
          updated: 0,
          errors: ['Endpoint invalid-id not found'],
        };

        endpointService.bulkUpdate.mockResolvedValue(bulkResult);

        const result = await controller.bulkUpdateEndpoints(bulkUpdateDto);

        expect(result.updated).toBe(0);
        expect(result.errors).toHaveLength(1);
      });
    });

    describe('toggleEndpointStatus', () => {
      it('should toggle endpoint status successfully', async () => {
        const newStatus = EndpointStatus.PAUSED;
        const updatedEndpoint = {
          ...mockEndpoint,
          status: newStatus,
          get isHealthy() {
            return true;
          },
          get currentStatus() {
            return 'healthy' as const;
          },
          get averageResponseTime() {
            return 100;
          },
          get uptimePercentage() {
            return 99.5;
          },
          getNextPingTime: jest.fn(),
          shouldPing: jest.fn(),
        };

        endpointService.toggleStatus.mockResolvedValue(updatedEndpoint);

        const result = await controller.toggleEndpointStatus(mockEndpoint.id, {
          status: newStatus,
        });

        expect(endpointService.toggleStatus).toHaveBeenCalledWith(
          mockEndpoint.id,
          newStatus,
        );
        expect(result.status).toBe(newStatus);
      });
    });

    describe('toggleEndpointActive', () => {
      it('should toggle endpoint active status successfully', async () => {
        const updatedEndpoint = {
          ...mockEndpoint,
          isActive: false,
          get isHealthy() {
            return true;
          },
          get currentStatus() {
            return 'healthy' as const;
          },
          get averageResponseTime() {
            return 100;
          },
          get uptimePercentage() {
            return 99.5;
          },
          getNextPingTime: jest.fn(),
          shouldPing: jest.fn(),
        };

        endpointService.toggleActive.mockResolvedValue(updatedEndpoint);

        const result = await controller.toggleEndpointActive(mockEndpoint.id, {
          isActive: false,
        });

        expect(endpointService.toggleActive).toHaveBeenCalledWith(
          mockEndpoint.id,
          false,
        );
        expect(result.isActive).toBe(false);
      });
    });
  });

  describe('Provider Management', () => {
    describe('getEndpointsByProvider', () => {
      it('should retrieve endpoints by provider', async () => {
        const provider = 'stripe';
        endpointService.getEndpointsByProvider.mockResolvedValue([
          mockEndpoint,
        ]);

        const result = await controller.getEndpointsByProvider(provider);

        expect(endpointService.getEndpointsByProvider).toHaveBeenCalledWith(
          provider,
        );
        expect(result).toEqual([mockEndpoint]);
      });
    });

    describe('createPresetEndpoints', () => {
      it('should create preset endpoints for a provider', async () => {
        const provider = 'stripe';
        const createdBy = 'test-user';
        endpointService.createPresetEndpoints.mockResolvedValue([mockEndpoint]);

        const result = await controller.createPresetEndpoints(provider, {
          createdBy,
        });

        expect(endpointService.createPresetEndpoints).toHaveBeenCalledWith(
          provider,
          createdBy,
        );
        expect(result).toEqual([mockEndpoint]);
      });
    });
  });

  describe('Manual Ping Operations', () => {
    describe('manualPing', () => {
      it('should perform manual ping successfully', async () => {
        const manualPingDto: ManualPingDto = {
          endpointId: mockEndpoint.id,
          saveResult: true,
          includeDetails: true,
        };
        const pingResponse = {
          endpointId: mockEndpoint.id,
          endpointName: mockEndpoint.name,
          status: PingStatus.SUCCESS,
          isSuccess: true,
          responseTimeMs: 150,
        };

        monitorService.pingSpecificEndpoint.mockResolvedValue(pingResponse);

        const result = await controller.manualPing(
          mockEndpoint.id,
          manualPingDto,
        );

        expect(monitorService.pingSpecificEndpoint).toHaveBeenCalledWith(
          mockEndpoint.id,
        );
        expect(result.isSuccess).toBe(true);
      });
    });

    describe('bulkPing', () => {
      it('should perform bulk ping successfully', async () => {
        const bulkPingDto: BulkPingDto = {
          endpointIds: [mockEndpoint.id],
          saveResults: true,
          includeDetails: false,
        };
        const bulkResponse = [
          {
            endpointId: mockEndpoint.id,
            endpointName: mockEndpoint.name,
            status: PingStatus.SUCCESS,
            isSuccess: true,
          },
        ];

        monitorService.bulkPing.mockResolvedValue(bulkResponse);

        const result = await controller.bulkPing(bulkPingDto);

        expect(monitorService.bulkPing).toHaveBeenCalledWith(
          bulkPingDto.endpointIds,
        );
        expect(result).toHaveLength(1);
        expect(result[0].isSuccess).toBe(true);
      });
    });

    describe('pingAllActive', () => {
      it('should ping all active endpoints successfully', async () => {
        const triggeredBy = 'test-user';
        const allActiveResponse = [
          {
            endpointId: mockEndpoint.id,
            endpointName: mockEndpoint.name,
            status: PingStatus.SUCCESS,
            isSuccess: true,
          },
        ];

        monitorService.pingAllActiveEndpoints.mockResolvedValue(
          allActiveResponse,
        );

        const result = await controller.pingAllActive({ triggeredBy });

        expect(monitorService.pingAllActiveEndpoints).toHaveBeenCalledWith(
          triggeredBy,
        );
        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Ping Results and History', () => {
    describe('getPingResults', () => {
      it('should retrieve ping results with filtering', async () => {
        const queryDto: PingResultQueryDto = {
          endpointId: mockEndpoint.id,
          status: PingStatus.SUCCESS,
          limit: 10,
          offset: 0,
        };
        const paginatedResults = {
          results: [mockPingResult],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        monitorService.getPingResults.mockResolvedValue(paginatedResults);

        const result = await controller.getPingResults(queryDto);

        expect(monitorService.getPingResults).toHaveBeenCalledWith(queryDto);
        expect(result.results).toHaveLength(1);
      });
    });

    describe('getPingResult', () => {
      it('should retrieve a specific ping result', async () => {
        monitorService.getPingResult.mockResolvedValue(mockPingResult);

        const result = await controller.getPingResult(mockPingResult.id);

        expect(monitorService.getPingResult).toHaveBeenCalledWith(
          mockPingResult.id,
        );
        expect(result).toEqual(mockPingResult);
      });

      it('should handle ping result not found', async () => {
        monitorService.getPingResult.mockRejectedValue(
          new NotFoundException('Ping result not found'),
        );

        await expect(
          controller.getPingResult('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getEndpointPingResults', () => {
      it('should retrieve ping results for specific endpoint', async () => {
        const queryDto: PingResultQueryDto = {
          limit: 10,
          offset: 0,
        };
        const endpointResults = {
          results: [mockPingResult],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        monitorService.getEndpointPingResults.mockResolvedValue(
          endpointResults,
        );

        const result = await controller.getEndpointPingResults(
          mockEndpoint.id,
          queryDto,
        );

        expect(monitorService.getEndpointPingResults).toHaveBeenCalledWith(
          mockEndpoint.id,
          queryDto,
        );
        expect(result.results).toHaveLength(1);
      });
    });

    describe('getEndpointHistory', () => {
      it('should retrieve endpoint history', async () => {
        const days = 7;
        const historyData = {
          endpoint: mockEndpoint,
          history: [
            {
              date: '2023-01-01',
              uptimePercentage: 99.5,
              averageResponseTime: 150,
              totalPings: 100,
              successfulPings: 99,
              incidents: 1,
            },
          ],
        };

        endpointService.getEndpointHistory.mockResolvedValue(historyData);

        const result = await controller.getEndpointHistory(
          mockEndpoint.id,
          days,
        );

        expect(endpointService.getEndpointHistory).toHaveBeenCalledWith(
          mockEndpoint.id,
          days,
        );
        expect(result.history).toHaveLength(1);
      });

      it('should use default days when not provided', async () => {
        const historyData = {
          endpoint: mockEndpoint,
          history: [],
        };

        endpointService.getEndpointHistory.mockResolvedValue(historyData);

        await controller.getEndpointHistory(mockEndpoint.id);

        expect(endpointService.getEndpointHistory).toHaveBeenCalledWith(
          mockEndpoint.id,
          7,
        );
      });
    });
  });

  describe('Statistics and Analytics', () => {
    describe('getStatistics', () => {
      it('should retrieve overall statistics', async () => {
        const statistics = {
          total: 10,
          active: 8,
          inactive: 2,
          healthy: 7,
          degraded: 1,
          down: 0,
          byProvider: { stripe: 3, google: 2, custom: 5 },
          byStatus: { active: 8, paused: 2 },
          averageUptime: 99.2,
          averageResponseTime: 180,
        };

        endpointService.getEndpointStatistics.mockResolvedValue(statistics);

        const result = await controller.getStatistics();

        expect(endpointService.getEndpointStatistics).toHaveBeenCalled();
        expect(result.total).toBe(10);
        expect(result.averageUptime).toBe(99.2);
      });
    });

    describe('getUptimeAnalytics', () => {
      it('should retrieve uptime analytics', async () => {
        const period = '24h';
        const uptimeMetrics = [
          {
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
            maxResponseTime: 300,
            lastCheckTime: new Date(),
            meanTimeToRecovery: 5,
            meanTimeBetweenFailures: 1440,
          },
        ];

        analyticsService.getUptimeMetrics.mockResolvedValue(uptimeMetrics);

        const result = await controller.getUptimeAnalytics(
          period,
          mockEndpoint.id,
        );

        expect(analyticsService.getUptimeMetrics).toHaveBeenCalledWith(
          mockEndpoint.id,
          period,
        );
        expect(result).toHaveLength(1);
        expect(result[0].uptimePercentage).toBe(99.5);
      });

      it('should use default period when not provided', async () => {
        analyticsService.getUptimeMetrics.mockResolvedValue([]);

        await controller.getUptimeAnalytics();

        expect(analyticsService.getUptimeMetrics).toHaveBeenCalledWith(
          undefined,
          '24h',
        );
      });
    });

    describe('getPerformanceAnalytics', () => {
      it('should retrieve performance analytics', async () => {
        const period = '7d';
        const performanceMetrics = [
          {
            endpointId: mockEndpoint.id,
            endpointName: mockEndpoint.name,
            responseTime: {
              average: 150,
              min: 100,
              max: 300,
              median: 140,
              p95: 250,
              p99: 280,
            },
            throughput: {
              requestsPerHour: 12,
              requestsPerDay: 288,
            },
            errorRate: 1,
            availability: 99.5,
          },
        ];

        analyticsService.getPerformanceMetrics.mockResolvedValue(
          performanceMetrics,
        );

        const result = await controller.getPerformanceAnalytics(
          period,
          mockEndpoint.id,
        );

        expect(analyticsService.getPerformanceMetrics).toHaveBeenCalledWith(
          mockEndpoint.id,
          period,
        );
        expect(result).toHaveLength(1);
        expect(result[0].responseTime.average).toBe(150);
      });
    });

    describe('getIncidentAnalytics', () => {
      it('should retrieve incident analytics', async () => {
        const period = '30d';
        const incidentMetrics = [
          {
            endpointId: mockEndpoint.id,
            endpointName: mockEndpoint.name,
            totalIncidents: 5,
            totalDowntime: 25,
            incidentsByType: {
              [PingStatus.SUCCESS]: 0,
              [PingStatus.TIMEOUT]: 3,
              [PingStatus.CONNECTION_ERROR]: 2,
              [PingStatus.DNS_ERROR]: 0,
              [PingStatus.SSL_ERROR]: 0,
              [PingStatus.HTTP_ERROR]: 0,
              [PingStatus.VALIDATION_ERROR]: 0,
              [PingStatus.UNKNOWN_ERROR]: 0,
            },
            incidentsByDay: [
              { date: '2023-01-01', count: 1, downtime: 5 },
              { date: '2023-01-02', count: 2, downtime: 10 },
            ],
            longestOutage: {
              duration: 15,
              startTime: new Date(),
              endTime: new Date(),
            },
            averageIncidentDuration: 5,
          },
        ];

        analyticsService.getIncidentMetrics.mockResolvedValue(incidentMetrics);

        const result = await controller.getIncidentAnalytics(
          period,
          mockEndpoint.id,
        );

        expect(analyticsService.getIncidentMetrics).toHaveBeenCalledWith(
          mockEndpoint.id,
          period,
        );
        expect(result).toHaveLength(1);
        expect(result[0].totalIncidents).toBe(5);
      });
    });

    describe('getComparisonAnalytics', () => {
      it('should retrieve comparison analytics', async () => {
        const current = '7d';
        const previous = '7d';
        const comparisonMetrics = {
          current: {
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
            maxResponseTime: 300,
            lastCheckTime: new Date(),
            meanTimeToRecovery: 5,
            meanTimeBetweenFailures: 1440,
          },
          previous: {
            endpointId: mockEndpoint.id,
            endpointName: mockEndpoint.name,
            url: mockEndpoint.url,
            provider: mockEndpoint.provider,
            uptimePercentage: 98.0,
            totalChecks: 80,
            successfulChecks: 78,
            failedChecks: 2,
            averageResponseTime: 180,
            minResponseTime: 120,
            maxResponseTime: 350,
            lastCheckTime: new Date(),
            meanTimeToRecovery: 8,
            meanTimeBetweenFailures: 1200,
          },
          change: {
            uptimePercentage: 1.5,
            averageResponseTime: -30,
            totalChecks: 20,
            errorRate: -1.5,
          },
        };

        analyticsService.getComparisonMetrics.mockResolvedValue(
          comparisonMetrics,
        );

        const result = await controller.getComparisonAnalytics(
          mockEndpoint.id,
          current,
          previous,
        );

        expect(analyticsService.getComparisonMetrics).toHaveBeenCalledWith(
          mockEndpoint.id,
          current,
          previous,
        );
        expect(result.change.uptimePercentage).toBe(1.5);
        expect(result.change.averageResponseTime).toBe(-30);
      });

      it('should use default periods when not provided', async () => {
        const mockComparison = {
          current: {} as any,
          previous: {} as any,
          change: {} as any,
        };

        analyticsService.getComparisonMetrics.mockResolvedValue(mockComparison);

        await controller.getComparisonAnalytics(mockEndpoint.id);

        expect(analyticsService.getComparisonMetrics).toHaveBeenCalledWith(
          mockEndpoint.id,
          '24h',
          '24h',
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      endpointService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getEndpoints({})).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should validate UUID parameters', async () => {
      // This would normally be handled by the ParseUUIDPipe
      // but we can test that the controller properly calls the service
      endpointService.findOne.mockResolvedValue(mockEndpoint);

      await controller.getEndpoint('123e4567-e89b-12d3-a456-426614174000');

      expect(endpointService.findOne).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should handle validation pipe errors for DTO validation', async () => {
      // ValidationPipe would normally handle this, but we can simulate the behavior
      const invalidDto = {
        name: '', // Empty name should fail validation
        url: 'invalid-url', // Invalid URL should fail validation
      } as CreateApiEndpointDto;

      endpointService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.createEndpoint(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
