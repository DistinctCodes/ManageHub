import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import { ApiKey, ApiKeyStatus } from '../api-key.entity';
import { ApiKeyUsage } from '../api-key-usage.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: jest.Mocked<Repository<ApiKey>>;
  let usageRepository: jest.Mocked<Repository<ApiKeyUsage>>;

  const mockApiKey: ApiKey = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    appName: 'test-app',
    keyHash: 'hashed-key',
    status: ApiKeyStatus.ACTIVE,
    allowedEndpoints: ['/api/test'],
    dailyLimit: 1000,
    currentDayUsage: 0,
    lastUsageDate: null,
    totalUsage: 0,
    contactEmail: 'test@example.com',
    description: 'Test app',
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockApiKeyRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockUsageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
        {
          provide: getRepositoryToken(ApiKeyUsage),
          useValue: mockUsageRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    apiKeyRepository = module.get(getRepositoryToken(ApiKey));
    usageRepository = module.get(getRepositoryToken(ApiKeyUsage));

    // Reset mocks
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashed-key' as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);
  });

  describe('createApiKey', () => {
    const createDto: CreateApiKeyDto = {
      appName: 'test-app',
      contactEmail: 'test@example.com',
      description: 'Test app',
      allowedEndpoints: ['/api/test'],
      dailyLimit: 1000,
    };

    it('should create a new API key successfully', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);
      apiKeyRepository.create.mockReturnValue(mockApiKey);
      apiKeyRepository.save.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(createDto);

      expect(result).toHaveProperty('apiKey');
      expect(result.appName).toBe(createDto.appName);
      expect(result.contactEmail).toBe(createDto.contactEmail);
      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { appName: createDto.appName }
      });
      expect(mockedBcrypt.hash).toHaveBeenCalled();
    });

    it('should throw ConflictException if app name already exists', async () => {
      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      await expect(service.createApiKey(createDto)).rejects.toThrow(ConflictException);
      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { appName: createDto.appName }
      });
    });
  });

  describe('findAll', () => {
    it('should return all API keys', async () => {
      const apiKeys = [mockApiKey];
      apiKeyRepository.find.mockResolvedValue(apiKeys);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].appName).toBe(mockApiKey.appName);
      expect(result[0]).not.toHaveProperty('keyHash');
      expect(apiKeyRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' }
      });
    });
  });

  describe('findOne', () => {
    it('should return a single API key', async () => {
      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.findOne(mockApiKey.id);

      expect(result.id).toBe(mockApiKey.id);
      expect(result).not.toHaveProperty('keyHash');
      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApiKey.id }
      });
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateApiKeyDto = {
      description: 'Updated description',
      dailyLimit: 2000,
    };

    it('should update API key successfully', async () => {
      const updatedApiKey = { ...mockApiKey, ...updateDto };
      apiKeyRepository.findOne
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(updatedApiKey);
      apiKeyRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(mockApiKey.id, updateDto);

      expect(result.description).toBe(updateDto.description);
      expect(result.dailyLimit).toBe(updateDto.dailyLimit);
      expect(apiKeyRepository.update).toHaveBeenCalledWith(mockApiKey.id, expect.objectContaining(updateDto));
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      apiKeyRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeApiKey(mockApiKey.id);

      expect(apiKeyRepository.update).toHaveBeenCalledWith(mockApiKey.id, {
        status: ApiKeyStatus.REVOKED
      });
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.update.mockResolvedValue({ affected: 0 } as any);

      await expect(service.revokeApiKey('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateApiKey', () => {
    it('should validate active API key successfully', async () => {
      apiKeyRepository.find.mockResolvedValue([mockApiKey]);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateApiKey('test-key');

      expect(result).toEqual(mockApiKey);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('test-key', mockApiKey.keyHash);
    });

    it('should return null for invalid API key', async () => {
      apiKeyRepository.find.mockResolvedValue([mockApiKey]);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateApiKey('invalid-key');

      expect(result).toBeNull();
    });

    it('should mark expired key and return null', async () => {
      const expiredKey = { ...mockApiKey, expiresAt: new Date('2020-01-01') };
      apiKeyRepository.find.mockResolvedValue([expiredKey]);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      apiKeyRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateApiKey('test-key');

      expect(result).toBeNull();
      expect(apiKeyRepository.update).toHaveBeenCalledWith(expiredKey.id, {
        status: ApiKeyStatus.EXPIRED
      });
    });
  });

  describe('trackUsage', () => {
    const mockUsage = {
      id: 'usage-id',
      apiKeyId: mockApiKey.id,
      endpoint: '/api/test',
      method: 'GET',
      statusCode: 200,
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      responseTime: 100,
      createdAt: new Date(),
    };

    it('should track usage successfully', async () => {
      usageRepository.create.mockReturnValue(mockUsage as ApiKeyUsage);
      usageRepository.save.mockResolvedValue(mockUsage as ApiKeyUsage);
      apiKeyRepository.save.mockResolvedValue(mockApiKey);

      await service.trackUsage(
        mockApiKey,
        '/api/test',
        'GET',
        200,
        'test-agent',
        '127.0.0.1',
        100
      );

      expect(usageRepository.create).toHaveBeenCalledWith({
        apiKeyId: mockApiKey.id,
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        responseTime: 100,
      });
      expect(usageRepository.save).toHaveBeenCalled();
      expect(apiKeyRepository.save).toHaveBeenCalled();
    });

    it('should reset daily usage for new day', async () => {
      const keyWithOldUsage = {
        ...mockApiKey,
        currentDayUsage: 500,
        lastUsageDate: new Date('2023-01-01'),
      };

      usageRepository.create.mockReturnValue(mockUsage as ApiKeyUsage);
      usageRepository.save.mockResolvedValue(mockUsage as ApiKeyUsage);
      apiKeyRepository.save.mockResolvedValue(keyWithOldUsage);

      await service.trackUsage(keyWithOldUsage, '/api/test', 'GET', 200);

      expect(keyWithOldUsage.currentDayUsage).toBe(1);
      expect(keyWithOldUsage.totalUsage).toBe(1);
    });

    it('should throw BadRequestException when daily limit exceeded', async () => {
      const keyAtLimit = {
        ...mockApiKey,
        currentDayUsage: 1000,
        dailyLimit: 1000,
        lastUsageDate: new Date(),
      };

      await expect(
        service.trackUsage(keyAtLimit, '/api/test', 'GET', 200)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockUsageData = [
        {
          id: '1',
          apiKeyId: mockApiKey.id,
          endpoint: '/api/test',
          method: 'GET',
          statusCode: 200,
          responseTime: 100,
          createdAt: new Date(),
        },
        {
          id: '2',
          apiKeyId: mockApiKey.id,
          endpoint: '/api/users',
          method: 'POST',
          statusCode: 201,
          responseTime: 150,
          createdAt: new Date(),
        },
      ] as ApiKeyUsage[];

      apiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      usageRepository.find.mockResolvedValue(mockUsageData);

      const result = await service.getUsageStats(mockApiKey.id);

      expect(result).toHaveProperty('totalRequests', 2);
      expect(result).toHaveProperty('todayRequests', 0);
      expect(result).toHaveProperty('dailyLimit', 1000);
      expect(result).toHaveProperty('remainingToday', 1000);
      expect(result).toHaveProperty('averageResponseTime', 125);
      expect(result).toHaveProperty('topEndpoints');
      expect(result).toHaveProperty('dailyUsage');
    });

    it('should throw NotFoundException if API key not found', async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.getUsageStats('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
