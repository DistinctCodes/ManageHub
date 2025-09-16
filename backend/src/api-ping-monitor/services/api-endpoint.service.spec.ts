import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ApiEndpointService } from './api-endpoint.service';
import {
  ApiEndpoint,
  EndpointStatus,
  HttpMethod,
  ApiProvider,
} from '../entities/api-endpoint.entity';
import { PingResult } from '../entities/ping-result.entity';
import {
  CreateApiEndpointDto,
  UpdateApiEndpointDto,
} from '../dto/api-endpoint.dto';

describe('ApiEndpointService', () => {
  let service: ApiEndpointService;
  let endpointRepository: jest.Mocked<Repository<ApiEndpoint>>;
  let pingResultRepository: jest.Mocked<Repository<PingResult>>;

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
    getNextPingTime: jest.fn(),
    shouldPing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiEndpointService,
        {
          provide: getRepositoryToken(ApiEndpoint),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findByIds: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getMany: jest.fn(),
            }),
          },
        },
        {
          provide: getRepositoryToken(PingResult),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ApiEndpointService>(ApiEndpointService);
    endpointRepository = module.get(getRepositoryToken(ApiEndpoint));
    pingResultRepository = module.get(getRepositoryToken(PingResult));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createEndpointDto: CreateApiEndpointDto = {
      name: 'Test Endpoint',
      description: 'Test Description',
      url: 'https://api.example.com/test',
      method: HttpMethod.GET,
      provider: ApiProvider.CUSTOM,
      createdBy: 'test-user',
    };

    it('should create a new endpoint successfully', async () => {
      endpointRepository.findOne.mockResolvedValue(null);
      endpointRepository.create.mockReturnValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(mockEndpoint);

      const result = await service.create(createEndpointDto);

      expect(endpointRepository.findOne).toHaveBeenCalledWith({
        where: { url: createEndpointDto.url },
      });
      expect(endpointRepository.create).toHaveBeenCalledWith({
        ...createEndpointDto,
        nextPingAt: expect.any(Date),
      });
      expect(endpointRepository.save).toHaveBeenCalledWith(mockEndpoint);
      expect(result).toEqual(mockEndpoint);
    });

    it('should throw BadRequestException if endpoint with same URL exists', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);

      await expect(service.create(createEndpointDto)).rejects.toThrow(
        new BadRequestException(
          `Endpoint with URL ${createEndpointDto.url} already exists`,
        ),
      );
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const invalidDto = { ...createEndpointDto, url: 'invalid-url' };
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(service.create(invalidDto)).rejects.toThrow(
        new BadRequestException('Invalid URL format'),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated endpoints', async () => {
      const queryDto = { limit: 10, offset: 0 };
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockEndpoint], 1]),
      } as any;

      endpointRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        endpoints: [mockEndpoint],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return an endpoint by id', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);

      const result = await service.findOne(mockEndpoint.id);

      expect(endpointRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEndpoint.id },
        relations: ['pingResults'],
      });
      expect(result).toEqual(mockEndpoint);
    });

    it('should throw NotFoundException if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('API endpoint with ID non-existent-id not found'),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateApiEndpointDto = {
      name: 'Updated Endpoint',
      description: 'Updated Description',
    };

    it('should update an endpoint successfully', async () => {
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
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(updatedEndpoint);

      const result = await service.update(mockEndpoint.id, updateDto);

      expect(endpointRepository.save).toHaveBeenCalledWith({
        ...mockEndpoint,
        ...updateDto,
      });
      expect(result).toEqual(updatedEndpoint);
    });

    it('should throw NotFoundException if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for URL conflicts when updating URL', async () => {
      const updateWithUrl = { ...updateDto, url: 'https://new-url.com' };
      const conflictingEndpoint = {
        ...mockEndpoint,
        id: 'different-id',
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

      endpointRepository.findOne
        .mockResolvedValueOnce(mockEndpoint) // First call for the endpoint being updated
        .mockResolvedValueOnce(conflictingEndpoint); // Second call for URL conflict check

      await expect(
        service.update(mockEndpoint.id, updateWithUrl),
      ).rejects.toThrow(
        new BadRequestException(
          `Endpoint with URL ${updateWithUrl.url} already exists`,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove an endpoint successfully', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.remove.mockResolvedValue(mockEndpoint);

      await service.remove(mockEndpoint.id);

      expect(endpointRepository.remove).toHaveBeenCalledWith(mockEndpoint);
    });

    it('should throw NotFoundException if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple endpoints successfully', async () => {
      const bulkUpdateDto = {
        endpointIds: [mockEndpoint.id],
        updatedBy: 'test-user',
        status: EndpointStatus.PAUSED,
      };

      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue({
        ...mockEndpoint,
        status: EndpointStatus.PAUSED,
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
      });

      const result = await service.bulkUpdate(bulkUpdateDto);

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during bulk update', async () => {
      const bulkUpdateDto = {
        endpointIds: ['non-existent-id'],
        updatedBy: 'test-user',
        status: EndpointStatus.PAUSED,
      };

      endpointRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkUpdate(bulkUpdateDto);

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        'Failed to update endpoint non-existent-id',
      );
    });
  });

  describe('toggleStatus', () => {
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

      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(updatedEndpoint);

      const result = await service.toggleStatus(mockEndpoint.id, newStatus);

      expect(result.status).toBe(newStatus);
    });

    it('should set nextPingAt when status is set to ACTIVE', async () => {
      const newStatus = EndpointStatus.ACTIVE;

      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(mockEndpoint);

      await service.toggleStatus(mockEndpoint.id, newStatus);

      expect(endpointRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: newStatus,
          nextPingAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getEndpointStatistics', () => {
    it('should return comprehensive endpoint statistics', async () => {
      const mockEndpoints = [mockEndpoint];

      endpointRepository.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // active
        .mockResolvedValueOnce(0); // inactive

      endpointRepository.find.mockResolvedValue(mockEndpoints);

      const result = await service.getEndpointStatistics();

      expect(result).toMatchObject({
        total: 1,
        active: 1,
        inactive: 0,
        healthy: expect.any(Number),
        degraded: expect.any(Number),
        down: expect.any(Number),
        byProvider: expect.any(Object),
        byStatus: expect.any(Object),
        averageUptime: expect.any(Number),
        averageResponseTime: expect.any(Number),
      });
    });
  });

  describe('getEndpointHistory', () => {
    it('should return endpoint history with metrics', async () => {
      const mockPingResults = [
        {
          id: '1',
          endpointId: mockEndpoint.id,
          isSuccess: true,
          responseTimeMs: 100,
          createdAt: new Date(),
        },
      ];

      endpointRepository.findOne.mockResolvedValue(mockEndpoint);

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPingResults),
      } as any;

      pingResultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getEndpointHistory(mockEndpoint.id, 7);

      expect(result).toMatchObject({
        endpoint: mockEndpoint,
        history: expect.any(Array),
      });
      expect(result.history).toHaveLength(7); // 7 days
    });
  });

  describe('createPresetEndpoints', () => {
    it('should create preset endpoints for a provider', async () => {
      endpointRepository.findOne.mockResolvedValue(null);
      endpointRepository.create.mockReturnValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(mockEndpoint);

      const result = await service.createPresetEndpoints('stripe', 'test-user');

      expect(result).toBeInstanceOf(Array);
      expect(endpointRepository.create).toHaveBeenCalled();
      expect(endpointRepository.save).toHaveBeenCalled();
    });

    it('should handle errors when creating preset endpoints', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint); // Existing endpoint

      const result = await service.createPresetEndpoints('stripe', 'test-user');

      expect(result).toHaveLength(0); // No endpoints created due to conflicts
    });

    it('should return empty array for unknown provider', async () => {
      const result = await service.createPresetEndpoints(
        'unknown-provider',
        'test-user',
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getActiveEndpoints', () => {
    it('should return only active endpoints', async () => {
      endpointRepository.find.mockResolvedValue([mockEndpoint]);

      const result = await service.getActiveEndpoints();

      expect(endpointRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: EndpointStatus.ACTIVE,
        },
        relations: ['pingResults'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockEndpoint]);
    });
  });

  describe('getHealthyEndpoints', () => {
    it('should return only healthy endpoints', async () => {
      const healthyEndpoint = {
        ...mockEndpoint,
        isHealthy: true,
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
      endpointRepository.find.mockResolvedValue([healthyEndpoint]);

      const result = await service.getHealthyEndpoints();

      expect(result).toHaveLength(1);
      expect(result[0].isHealthy).toBe(true);
    });
  });

  describe('getUnhealthyEndpoints', () => {
    it('should return only unhealthy endpoints', async () => {
      const unhealthyEndpoint = {
        ...mockEndpoint,
        isHealthy: false,
        get currentStatus() {
          return 'down' as const;
        },
        get averageResponseTime() {
          return 100;
        },
        get uptimePercentage() {
          return 50.0;
        },
        getNextPingTime: jest.fn(),
        shouldPing: jest.fn(),
      };
      endpointRepository.find.mockResolvedValue([unhealthyEndpoint]);

      const result = await service.getUnhealthyEndpoints();

      expect(result).toHaveLength(1);
      expect(result[0].isHealthy).toBe(false);
    });
  });
});
