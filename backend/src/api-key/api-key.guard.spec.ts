import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiKeyService } from '../api-key.service';
import { ApiKeyStatus } from '../api-key.entity';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let service: jest.Mocked<ApiKeyService>;
  let reflector: jest.Mocked<Reflector>;

  const mockApiKey = {
    id: '123',
    appName: 'test-app',
    keyHash: 'hash',
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
    const mockService = {
      validateApiKey: jest.fn(),
      trackUsage: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: ApiKeyService,
          useValue: mockService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    service = module.get(ApiKeyService);
    reflector = module.get(Reflector);
  });

  const createMockExecutionContext = (headers: any = {}, query: any = {}): ExecutionContext => {
    const mockRequest = {
      headers,
      query,
      get: jest.fn((header: string) => headers[header.toLowerCase()]),
      ip: '127.0.0.1',
      method: 'GET',
      route: { path: '/api/test' },
      url: '/api/test',
    };

    const mockResponse = {
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
      }),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access with valid API key in Authorization header', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-api-key',
      });

      service.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.get.mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(service.validateApiKey).toHaveBeenCalledWith('valid-api-key');
    });

    it('should allow access with valid API key in X-API-Key header', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'valid-api-key',
      });

      service.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.get.mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(service.validateApiKey).toHaveBeenCalledWith('valid-api-key');
    });

    it('should allow access with valid API key in query parameter', async () => {
      const context = createMockExecutionContext({}, { api_key: 'valid-api-key' });

      service.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.get.mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(service.validateApiKey).toHaveBeenCalledWith('valid-api-key');
    });

    it('should throw UnauthorizedException if no API key provided', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if API key is invalid', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'invalid-key',
      });

      service.validateApiKey.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should check endpoint restrictions', async () => {
      const restrictedApiKey = {
        ...mockApiKey,
        allowedEndpoints: ['/api/users'],
      };

      const context = createMockExecutionContext({
        'x-api-key': 'valid-key',
      });

      service.validateApiKey.mockResolvedValue(restrictedApiKey);
      reflector.get.mockReturnValue(['/api/test']);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access if endpoint is allowed', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'valid-key',
      });

      service.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.get.mockReturnValue(['/api/test']);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should track usage after response finishes', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'valid-key',
        'user-agent': 'test-agent',
      });

      service.validateApiKey.mockResolvedValue(mockApiKey);
      service.trackUsage.mockResolvedValue();
      reflector.get.mockReturnValue(null);

      await guard.canActivate(context);

      // Wait for the response.on('finish') callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(service.trackUsage).toHaveBeenCalledWith(
        mockApiKey,
        '/api/test',
        'GET',
        200,
        'test-agent',
        '127.0.0.1',
        expect.any(Number),
      );
    });
  });
});