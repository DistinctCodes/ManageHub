import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiNotificationService, NotificationEvent } from './api-notification.service';
import { ApiEndpoint, EndpointStatus, HttpMethod, ApiProvider } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';

describe('ApiNotificationService', () => {
  let service: ApiNotificationService;
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
      uptimeThreshold: 95,
      emailNotifications: ['admin@example.com'],
      slackWebhook: 'https://hooks.slack.com/test',
      webhookUrl: 'https://webhook.example.com/alert',
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

  const mockSuccessfulPingResult: PingResult = {
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
    createdAt: new Date(),
    endpoint: mockEndpoint,
  };

  const mockFailedPingResult: PingResult = {
    id: 'result-2',
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
    createdAt: new Date(),
    endpoint: mockEndpoint,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiNotificationService,
        {
          provide: getRepositoryToken(ApiEndpoint),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PingResult),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiNotificationService>(ApiNotificationService);
    endpointRepository = module.get(getRepositoryToken(ApiEndpoint));
    pingResultRepository = module.get(getRepositoryToken(PingResult));
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear internal state
    service['failureCounters'].clear();
    service['lastNotificationTimes'].clear();
  });

  describe('handlePingResult', () => {
    it('should handle successful ping result without alerts disabled', async () => {
      const endpointWithoutAlerts = { ...mockEndpoint, enableAlerts: false };
      
      await service.handlePingResult(mockSuccessfulPingResult, endpointWithoutAlerts);
      
      // Should not process notifications when alerts are disabled
      expect(service['failureCounters'].size).toBe(0);
    });

    it('should handle successful ping result and reset failure counter', async () => {
      // Set up a previous failure count
      service['failureCounters'].set(mockEndpoint.id, 2);
      
      await service.handlePingResult(mockSuccessfulPingResult, mockEndpoint);
      
      expect(service['failureCounters'].get(mockEndpoint.id)).toBe(0);
    });

    it('should send recovery notification after consecutive failures threshold', async () => {
      // Set up previous failures that exceeded threshold
      service['failureCounters'].set(mockEndpoint.id, 3);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service.handlePingResult(mockSuccessfulPingResult, mockEndpoint);
      
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'recovery',
          severity: 'medium',
          endpointId: mockEndpoint.id,
          endpointName: mockEndpoint.name,
        })
      );
    });

    it('should handle failed ping result and increment failure counter', async () => {
      await service.handlePingResult(mockFailedPingResult, mockEndpoint);
      
      expect(service['failureCounters'].get(mockEndpoint.id)).toBe(1);
    });

    it('should send failure notification when threshold is reached', async () => {
      // Set up to reach the threshold (3 consecutive failures)
      service['failureCounters'].set(mockEndpoint.id, 2);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service.handlePingResult(mockFailedPingResult, mockEndpoint);
      
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failure',
          endpointId: mockEndpoint.id,
          endpointName: mockEndpoint.name,
        })
      );
    });

    it('should not send notification if cooldown period has not expired', async () => {
      // Set up previous notification time within cooldown period
      service['lastNotificationTimes'].set(mockEndpoint.id, new Date());
      service['failureCounters'].set(mockEndpoint.id, 2);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service.handlePingResult(mockFailedPingResult, mockEndpoint);
      
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('should check for slow response times', async () => {
      const slowPingResult = {
        ...mockSuccessfulPingResult,
        responseTimeMs: 6000, // Exceeds threshold of 5000ms
      };
      const checkSlowResponseSpy = jest.spyOn(service as any, 'checkSlowResponse').mockResolvedValue(undefined);
      
      await service.handlePingResult(slowPingResult, mockEndpoint);
      
      expect(checkSlowResponseSpy).toHaveBeenCalledWith(mockEndpoint, slowPingResult);
    });

    it('should check endpoint health', async () => {
      const checkEndpointHealthSpy = jest.spyOn(service as any, 'checkEndpointHealth').mockResolvedValue(undefined);
      
      await service.handlePingResult(mockSuccessfulPingResult, mockEndpoint);
      
      expect(checkEndpointHealthSpy).toHaveBeenCalledWith(mockEndpoint);
    });

    it('should handle errors gracefully', async () => {
      const errorEndpoint = { ...mockEndpoint, alertConfig: null };
      
      // Should not throw error
      await expect(service.handlePingResult(mockSuccessfulPingResult, errorEndpoint)).resolves.not.toThrow();
    });
  });

  describe('checkSlowResponse', () => {
    it('should send slow response notification when threshold is exceeded', async () => {
      const slowPingResult = {
        ...mockSuccessfulPingResult,
        responseTimeMs: 6000,
      };
      
      // Mock cooldown as expired
      jest.spyOn(service as any, 'isCooldownExpired').mockReturnValue(true);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkSlowResponse'](mockEndpoint, slowPingResult);
      
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'slow_response',
          severity: 'low',
          message: expect.stringContaining('responding slowly'),
        })
      );
    });

    it('should not send notification if response time is within threshold', async () => {
      const fastPingResult = {
        ...mockSuccessfulPingResult,
        responseTimeMs: 1000, // Below threshold
      };
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkSlowResponse'](mockEndpoint, fastPingResult);
      
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('should not send notification if no response time threshold is configured', async () => {
      const endpointWithoutThreshold = {
        ...mockEndpoint,
        alertConfig: { ...mockEndpoint.alertConfig, responseTimeThresholdMs: undefined },
      };
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkSlowResponse'](endpointWithoutThreshold, mockSuccessfulPingResult);
      
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkEndpointHealth', () => {
    it('should send downtime alert when uptime falls below threshold', async () => {
      const unhealthyEndpoint = {
        ...mockEndpoint,
        uptimePercentage: 90, // Below threshold of 95%
      };
      
      jest.spyOn(service as any, 'isCooldownExpired').mockReturnValue(true);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkEndpointHealth'](unhealthyEndpoint);
      
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'downtime_alert',
          severity: 'high',
          message: expect.stringContaining('uptime is below threshold'),
        })
      );
    });

    it('should not send alert if uptime is above threshold', async () => {
      const healthyEndpoint = {
        ...mockEndpoint,
        uptimePercentage: 99, // Above threshold
      };
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkEndpointHealth'](healthyEndpoint);
      
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('should not send alert if cooldown has not expired', async () => {
      const unhealthyEndpoint = {
        ...mockEndpoint,
        uptimePercentage: 90,
      };
      
      jest.spyOn(service as any, 'isCooldownExpired').mockReturnValue(false);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service['checkEndpointHealth'](unhealthyEndpoint);
      
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('calculateSeverity', () => {
    it('should return critical for DNS errors', () => {
      const result = service['calculateSeverity'](1, PingStatus.DNS_ERROR);
      expect(result).toBe('critical');
    });

    it('should return critical for many consecutive failures', () => {
      const result = service['calculateSeverity'](10, PingStatus.CONNECTION_ERROR);
      expect(result).toBe('critical');
    });

    it('should return high for timeout errors', () => {
      const result = service['calculateSeverity'](3, PingStatus.TIMEOUT);
      expect(result).toBe('high');
    });

    it('should return medium for connection errors', () => {
      const result = service['calculateSeverity'](3, PingStatus.CONNECTION_ERROR);
      expect(result).toBe('medium');
    });

    it('should return low for unknown errors with few failures', () => {
      const result = service['calculateSeverity'](1, PingStatus.UNKNOWN_ERROR);
      expect(result).toBe('low');
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors for different severities', () => {
      expect(service['getSeverityColor']('critical')).toBe('#ff0000');
      expect(service['getSeverityColor']('high')).toBe('#ff8800');
      expect(service['getSeverityColor']('medium')).toBe('#ffcc00');
      expect(service['getSeverityColor']('low')).toBe('#88cc00');
      expect(service['getSeverityColor']('unknown')).toBe('#cccccc');
    });
  });

  describe('isCooldownExpired', () => {
    it('should return true if no previous notification exists', () => {
      const result = service['isCooldownExpired']('test-endpoint');
      expect(result).toBe(true);
    });

    it('should return true if cooldown period has expired', () => {
      const pastTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      service['lastNotificationTimes'].set('test-endpoint', pastTime);
      
      const result = service['isCooldownExpired']('test-endpoint');
      expect(result).toBe(true);
    });

    it('should return false if cooldown period has not expired', () => {
      const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      service['lastNotificationTimes'].set('test-endpoint', recentTime);
      
      const result = service['isCooldownExpired']('test-endpoint');
      expect(result).toBe(false);
    });

    it('should use custom cooldown period', () => {
      const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      service['lastNotificationTimes'].set('test-endpoint', recentTime);
      
      const result = service['isCooldownExpired']('test-endpoint', 2 * 60 * 1000); // 2 minutes
      expect(result).toBe(true);
    });
  });

  describe('getLastSuccessTime', () => {
    it('should return last success time from database', async () => {
      const lastSuccessTime = new Date();
      pingResultRepository.findOne.mockResolvedValue({
        ...mockSuccessfulPingResult,
        createdAt: lastSuccessTime,
      });
      
      const result = await service['getLastSuccessTime'](mockEndpoint.id);
      
      expect(pingResultRepository.findOne).toHaveBeenCalledWith({
        where: {
          endpointId: mockEndpoint.id,
          isSuccess: true,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(lastSuccessTime);
    });

    it('should return null if no successful ping found', async () => {
      pingResultRepository.findOne.mockResolvedValue(null);
      
      const result = await service['getLastSuccessTime'](mockEndpoint.id);
      
      expect(result).toBeNull();
    });
  });

  describe('testNotification', () => {
    it('should send test notification for existing endpoint', async () => {
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      const sendNotificationSpy = jest.spyOn(service as any, 'sendNotification').mockResolvedValue(undefined);
      
      await service.testNotification(mockEndpoint.id, 'email');
      
      expect(endpointRepository.findOne).toHaveBeenCalledWith({ where: { id: mockEndpoint.id } });
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failure',
          severity: 'low',
          message: expect.stringContaining('Test notification'),
        })
      );
    });

    it('should throw error if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);
      
      await expect(service.testNotification('non-existent-id', 'email'))
        .rejects.toThrow('Endpoint not found');
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings for existing endpoint', async () => {
      const updatedEndpoint = { ...mockEndpoint };
      endpointRepository.findOne.mockResolvedValue(mockEndpoint);
      endpointRepository.save.mockResolvedValue(updatedEndpoint);
      
      const newSettings = {
        emailEnabled: false,
        slackEnabled: true,
        emailRecipients: ['new@example.com'],
      };
      
      await service.updateNotificationSettings(mockEndpoint.id, newSettings);
      
      expect(endpointRepository.findOne).toHaveBeenCalledWith({ where: { id: mockEndpoint.id } });
      expect(endpointRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          alertConfig: expect.objectContaining(newSettings),
        })
      );
    });

    it('should throw error if endpoint not found', async () => {
      endpointRepository.findOne.mockResolvedValue(null);
      
      await expect(service.updateNotificationSettings('non-existent-id', {}))
        .rejects.toThrow('Endpoint not found');
    });
  });

  describe('cleanup', () => {
    it('should remove old failure counters and notification times', () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      service['lastNotificationTimes'].set('old-endpoint', oldTime);
      service['lastNotificationTimes'].set('recent-endpoint', recentTime);
      service['failureCounters'].set('old-endpoint', 5);
      service['failureCounters'].set('recent-endpoint', 2);
      
      service.cleanup();
      
      expect(service['lastNotificationTimes'].has('old-endpoint')).toBe(false);
      expect(service['lastNotificationTimes'].has('recent-endpoint')).toBe(true);
      expect(service['failureCounters'].has('old-endpoint')).toBe(false);
      expect(service['failureCounters'].has('recent-endpoint')).toBe(true);
    });
  });

  describe('sendNotification', () => {
    let mockEvent: NotificationEvent;

    beforeEach(() => {
      mockEvent = {
        type: 'failure',
        severity: 'high',
        endpointId: mockEndpoint.id,
        endpointName: mockEndpoint.name,
        endpointUrl: mockEndpoint.url,
        message: 'Test notification',
        details: {},
        timestamp: new Date(),
        alertConfig: mockEndpoint.alertConfig,
      };
    });

    it('should send email notification when configured', async () => {
      const sendEmailSpy = jest.spyOn(service as any, 'sendEmailNotification').mockResolvedValue(undefined);
      
      await service['sendNotification'](mockEvent);
      
      expect(sendEmailSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should send slack notification when configured', async () => {
      const sendSlackSpy = jest.spyOn(service as any, 'sendSlackNotification').mockResolvedValue(undefined);
      
      await service['sendNotification'](mockEvent);
      
      expect(sendSlackSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should send webhook notification when configured', async () => {
      const sendWebhookSpy = jest.spyOn(service as any, 'sendWebhookNotification').mockResolvedValue(undefined);
      
      await service['sendNotification'](mockEvent);
      
      expect(sendWebhookSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle notification failures gracefully', async () => {
      jest.spyOn(service as any, 'sendEmailNotification').mockRejectedValue(new Error('Email failed'));
      jest.spyOn(service as any, 'sendSlackNotification').mockRejectedValue(new Error('Slack failed'));
      jest.spyOn(service as any, 'sendWebhookNotification').mockRejectedValue(new Error('Webhook failed'));
      
      // Should not throw error even if all notifications fail
      await expect(service['sendNotification'](mockEvent)).resolves.not.toThrow();
    });
  });
});