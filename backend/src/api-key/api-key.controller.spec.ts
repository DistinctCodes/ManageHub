import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from '../api-key.controller';
import { ApiKeyService } from '../api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import { ApiKeyStatus } from '../api-key.entity';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let service: jest.Mocked<ApiKeyService>;

  const mockApiKeyResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    appName: 'test-app',
    status: ApiKeyStatus.ACTIVE,
    allowedEndpoints: ['/api/test'],
    dailyLimit: 1000,
    currentDayUsage: 0,
    totalUsage: 0,
    contactEmail: 'test@example.com',
    description: 'Test app',
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateResponse = {
    ...mockApiKeyResponse,
    apiKey: 'ak_generated_key_here',
  };

  beforeEach(async () => {
    const mockService = {
      createApiKey: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      revokeApiKey: jest.fn(),
      getUsageStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    service = module.get(ApiKeyService);
  });

  describe('create', () => {
    it('should create a new API key', async () => {
      const createDto: CreateApiKeyDto = {
        appName: 'test-app',
        contactEmail: 'test@example.com',
        description: 'Test app',
      };

      service.createApiKey.mockResolvedValue(mockCreateResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreateResponse);
      expect(service.createApiKey).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all API keys', async () => {
      const mockKeys = [mockApiKeyResponse];
      service.findAll.mockResolvedValue(mockKeys);

      const result = await controller.findAll();

      expect(result).toEqual(mockKeys);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single API key', async () => {
      service.findOne.mockResolvedValue(mockApiKeyResponse);

      const result = await controller.findOne(mockApiKeyResponse.id);

      expect(result).toEqual(mockApiKeyResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockApiKeyResponse.id);
    });
  });

  describe('update', () => {
    it('should update an API key', async () => {
      const updateDto: UpdateApiKeyDto = {
        description: 'Updated description',
      };
      const updatedResponse = { ...mockApiKeyResponse, ...updateDto };

      service.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(mockApiKeyResponse.id, updateDto);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(mockApiKeyResponse.id, updateDto);
    });
  });

  describe('revoke', () => {
    it('should revoke an API key', async () => {
      service.revokeApiKey.mockResolvedValue();

      await controller.revoke(mockApiKeyResponse.id);

      expect(service.revokeApiKey).toHaveBeenCalledWith(mockApiKeyResponse.id);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockStats = {
        totalRequests: 100,
        todayRequests: 10,
        dailyLimit: 1000,
        remainingToday: 990,
        averageResponseTime: 150,
        topEndpoints: [{ endpoint: '/api/test', count: 50 }],
        dailyUsage: [{ date: '2023-01-01', count: 10 }],
      };

      service.getUsageStats.mockResolvedValue(mockStats);

      const result = await controller.getUsageStats(mockApiKeyResponse.id, 30);

      expect(result).toEqual(mockStats);
      expect(service.getUsageStats).toHaveBeenCalledWith(mockApiKeyResponse.id, 30);
    });

    it('should use default days if not provided', async () => {
      const mockStats = {
        totalRequests: 100,
        todayRequests: 10,
        dailyLimit: 1000,
        remainingToday: 990,
        averageResponseTime: 150,
        topEndpoints: [],
        dailyUsage: [],
      };

      service.getUsageStats.mockResolvedValue(mockStats);

      await controller.getUsageStats(mockApiKeyResponse.id);

      expect(service.getUsageStats).toHaveBeenCalledWith(mockApiKeyResponse.id, undefined);
    });
  });
});