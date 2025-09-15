import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTrackerController } from './device-tracker.controller';
import { DeviceTrackerService } from './device-tracker.service';
import { DeviceSessionService } from './services/device-session.service';
import { DeviceAnomalyDetectionService } from './services/device-anomaly-detection.service';
import { DeviceNotificationService } from './services/device-notification.service';
import { DeviceAuditService } from './services/device-audit.service';
import { DeviceRiskAssessmentService } from './services/device-risk-assessment.service';
import { GeolocationService } from './services/geolocation.service';
import { DeviceSecurityGuard } from './guards/device-security.guard';
import {
  DeviceTracker,
  DeviceType,
  DeviceStatus,
  RiskLevel,
} from './entities/device-tracker.entity';
import { CreateDeviceTrackerDto } from './dto/create-device-tracker.dto';
import { UpdateDeviceTrackerDto } from './dto/update-device-tracker.dto';

describe('DeviceTrackerController (Integration)', () => {
  let app: INestApplication;
  let controller: DeviceTrackerController;
  let deviceTrackerService: DeviceTrackerService;
  let repository: Repository<DeviceTracker>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      execute: jest.fn(),
    })),
  };

  const mockDeviceSessionService = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    terminateSession: jest.fn(),
    getActiveSessionsForDevice: jest.fn(),
    getActiveSessionsForUser: jest.fn(),
    terminateAllSessionsForDevice: jest.fn(),
    terminateAllSessionsForUser: jest.fn(),
    getSessionSummary: jest.fn(),
    getSuspiciousSessions: jest.fn(),
  };

  const mockAnomalyDetectionService = {
    runAnomalyDetection: jest.fn(),
    getAllAnomalies: jest.fn(),
    getDeviceAnomalies: jest.fn(),
    getAnomalyStatistics: jest.fn(),
  };

  const mockNotificationService = {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAsAcknowledged: jest.fn(),
    getNotificationStatistics: jest.fn(),
  };

  const mockAuditService = {
    queryAuditLogs: jest.fn(),
    getAuditStatistics: jest.fn(),
    exportAuditLogs: jest.fn(),
    getComplianceReport: jest.fn(),
  };

  const mockRiskAssessmentService = {
    calculateRiskScore: jest.fn(),
    assessSecurityFlags: jest.fn(),
  };

  const mockGeolocationService = {
    analyzeIP: jest.fn(),
    updateDeviceGeolocation: jest.fn(),
  };

  const mockSecurityGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTrackerController],
      providers: [
        DeviceTrackerService,
        {
          provide: getRepositoryToken(DeviceTracker),
          useValue: mockRepository,
        },
        {
          provide: DeviceSessionService,
          useValue: mockDeviceSessionService,
        },
        {
          provide: DeviceAnomalyDetectionService,
          useValue: mockAnomalyDetectionService,
        },
        {
          provide: DeviceNotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: DeviceAuditService,
          useValue: mockAuditService,
        },
        {
          provide: DeviceRiskAssessmentService,
          useValue: mockRiskAssessmentService,
        },
        {
          provide: GeolocationService,
          useValue: mockGeolocationService,
        },
      ],
    })
      .overrideGuard(DeviceSecurityGuard)
      .useValue(mockSecurityGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<DeviceTrackerController>(DeviceTrackerController);
    deviceTrackerService =
      module.get<DeviceTrackerService>(DeviceTrackerService);
    repository = module.get<Repository<DeviceTracker>>(
      getRepositoryToken(DeviceTracker),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Basic CRUD Operations', () => {
    describe('POST /device-tracker', () => {
      it('should create a new device tracker', async () => {
        const createDto: CreateDeviceTrackerDto = {
          userId: 'user-123',
          deviceType: DeviceType.DESKTOP,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'fingerprint-123',
        };

        const expectedDevice: DeviceTracker = {
          id: 'device-123',
          ...createDto,
          createdAt: new Date(),
          lastSeenAt: new Date(),
          status: DeviceStatus.ACTIVE,
          isTrusted: false,
          riskLevel: RiskLevel.LOW,
        } as DeviceTracker;

        mockRepository.create.mockReturnValue(expectedDevice);
        mockRepository.save.mockResolvedValue(expectedDevice);
        mockRiskAssessmentService.calculateRiskScore.mockReturnValue({
          riskScore: 10,
          riskLevel: RiskLevel.LOW,
          shouldBlock: false,
          riskFactors: [],
          recommendations: [],
        });
        mockGeolocationService.updateDeviceGeolocation.mockResolvedValue(
          expectedDevice,
        );

        const response = await request(app.getHttpServer())
          .post('/device-tracker')
          .send(createDto)
          .expect(201);

        expect(response.body).toMatchObject({
          id: expectedDevice.id,
          userId: createDto.userId,
          deviceType: createDto.deviceType,
          ipAddress: createDto.ipAddress,
        });
      });

      it('should return 400 for invalid data', async () => {
        const invalidDto = {
          // Missing required fields
          deviceType: 'INVALID_TYPE',
        };

        await request(app.getHttpServer())
          .post('/device-tracker')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /device-tracker', () => {
      it('should return all device trackers with pagination', async () => {
        const mockDevices: DeviceTracker[] = [
          {
            id: 'device-1',
            userId: 'user-1',
            deviceType: DeviceType.DESKTOP,
            ipAddress: '192.168.1.1',
            status: DeviceStatus.ACTIVE,
          } as DeviceTracker,
          {
            id: 'device-2',
            userId: 'user-2',
            deviceType: DeviceType.MOBILE,
            ipAddress: '192.168.1.2',
            status: DeviceStatus.ACTIVE,
          } as DeviceTracker,
        ];

        mockRepository.find.mockResolvedValue(mockDevices);
        mockRepository.count.mockResolvedValue(2);

        const response = await request(app.getHttpServer())
          .get('/device-tracker')
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.data).toHaveLength(2);
      });

      it('should filter devices by status', async () => {
        const mockDevices: DeviceTracker[] = [
          {
            id: 'device-1',
            status: DeviceStatus.ACTIVE,
          } as DeviceTracker,
        ];

        mockRepository.find.mockResolvedValue(mockDevices);
        mockRepository.count.mockResolvedValue(1);

        await request(app.getHttpServer())
          .get('/device-tracker')
          .query({ status: DeviceStatus.ACTIVE })
          .expect(200);

        expect(mockRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: DeviceStatus.ACTIVE,
            }),
          }),
        );
      });
    });

    describe('GET /device-tracker/:id', () => {
      it('should return a specific device tracker', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
          userId: 'user-123',
          deviceType: DeviceType.DESKTOP,
          ipAddress: '192.168.1.1',
          status: DeviceStatus.ACTIVE,
        } as DeviceTracker;

        mockRepository.findOneBy.mockResolvedValue(mockDevice);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/device-123')
          .expect(200);

        expect(response.body).toMatchObject({
          id: 'device-123',
          userId: 'user-123',
          deviceType: DeviceType.DESKTOP,
        });
      });

      it('should return 404 for non-existent device', async () => {
        mockRepository.findOneBy.mockResolvedValue(null);

        await request(app.getHttpServer())
          .get('/device-tracker/non-existent')
          .expect(404);
      });
    });

    describe('PATCH /device-tracker/:id', () => {
      it('should update a device tracker', async () => {
        const updateDto: UpdateDeviceTrackerDto = {
          status: DeviceStatus.SUSPICIOUS,
        };

        const originalDevice: DeviceTracker = {
          id: 'device-123',
          status: DeviceStatus.ACTIVE,
        } as DeviceTracker;

        const updatedDevice: DeviceTracker = {
          ...originalDevice,
          ...updateDto,
        };

        mockRepository.findOneBy.mockResolvedValue(originalDevice);
        mockRepository.save.mockResolvedValue(updatedDevice);

        const response = await request(app.getHttpServer())
          .patch('/device-tracker/device-123')
          .send(updateDto)
          .expect(200);

        expect(response.body.status).toBe(DeviceStatus.SUSPICIOUS);
      });
    });

    describe('DELETE /device-tracker/:id', () => {
      it('should delete a device tracker', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
        } as DeviceTracker;

        mockRepository.findOneBy.mockResolvedValue(mockDevice);
        mockRepository.delete.mockResolvedValue({ affected: 1 });

        await request(app.getHttpServer())
          .delete('/device-tracker/device-123')
          .expect(204);
      });
    });
  });

  describe('Enhanced Security Operations', () => {
    describe('GET /device-tracker/dashboard', () => {
      it('should return security dashboard data', async () => {
        const mockDashboard = {
          totalDevices: 100,
          activeDevices: 85,
          suspiciousDevices: 10,
          blockedDevices: 5,
          riskDistribution: {
            low: 70,
            medium: 20,
            high: 8,
            critical: 2,
          },
          topRiskCountries: [
            { country: 'CN', count: 15 },
            { country: 'RU', count: 8 },
          ],
          recentAnomalies: [],
        };

        mockRepository.createQueryBuilder().getRawMany.mockResolvedValue([
          { riskLevel: RiskLevel.LOW, count: '70' },
          { riskLevel: RiskLevel.MEDIUM, count: '20' },
          { riskLevel: RiskLevel.HIGH, count: '8' },
          { riskLevel: RiskLevel.CRITICAL, count: '2' },
        ]);
        mockRepository.count
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(85) // active
          .mockResolvedValueOnce(10) // suspicious
          .mockResolvedValueOnce(5); // blocked

        const response = await request(app.getHttpServer())
          .get('/device-tracker/dashboard')
          .expect(200);

        expect(response.body).toHaveProperty('totalDevices');
        expect(response.body).toHaveProperty('riskDistribution');
        expect(response.body).toHaveProperty('topRiskCountries');
      });
    });

    describe('POST /device-tracker/:id/block', () => {
      it('should block a device', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
          status: DeviceStatus.ACTIVE,
        } as DeviceTracker;

        const blockData = {
          reason: 'Suspicious activity detected',
          blockedBy: 'admin-user',
        };

        mockRepository.findOneBy.mockResolvedValue(mockDevice);
        mockRepository.save.mockResolvedValue({
          ...mockDevice,
          status: DeviceStatus.BLOCKED,
          blockedAt: new Date(),
          blockedReason: blockData.reason,
        });

        const response = await request(app.getHttpServer())
          .post('/device-tracker/device-123/block')
          .send(blockData)
          .expect(200);

        expect(response.body.status).toBe(DeviceStatus.BLOCKED);
        expect(response.body.blockedReason).toBe(blockData.reason);
      });
    });

    describe('POST /device-tracker/:id/unblock', () => {
      it('should unblock a device', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
          status: DeviceStatus.BLOCKED,
          blockedAt: new Date(),
          blockedReason: 'Test reason',
        } as DeviceTracker;

        mockRepository.findOneBy.mockResolvedValue(mockDevice);
        mockRepository.save.mockResolvedValue({
          ...mockDevice,
          status: DeviceStatus.ACTIVE,
          blockedAt: null,
          blockedReason: null,
        });

        const response = await request(app.getHttpServer())
          .post('/device-tracker/device-123/unblock')
          .expect(200);

        expect(response.body.status).toBe(DeviceStatus.ACTIVE);
        expect(response.body.blockedAt).toBeNull();
      });
    });

    describe('GET /device-tracker/risk-level/:level', () => {
      it('should return devices by risk level', async () => {
        const mockDevices: DeviceTracker[] = [
          {
            id: 'device-1',
            riskLevel: RiskLevel.HIGH,
          } as DeviceTracker,
        ];

        mockRepository.find.mockResolvedValue(mockDevices);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/risk-level/HIGH')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].riskLevel).toBe(RiskLevel.HIGH);
      });
    });

    describe('GET /device-tracker/suspicious', () => {
      it('should return suspicious devices', async () => {
        const mockDevices: DeviceTracker[] = [
          {
            id: 'device-1',
            status: DeviceStatus.SUSPICIOUS,
            riskLevel: RiskLevel.HIGH,
          } as DeviceTracker,
        ];

        mockRepository.find.mockResolvedValue(mockDevices);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/suspicious')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].status).toBe(DeviceStatus.SUSPICIOUS);
      });
    });

    describe('POST /device-tracker/:id/failed-attempt', () => {
      it('should record a failed attempt', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
          failedAttempts: 2,
        } as DeviceTracker;

        mockRepository.findOneBy.mockResolvedValue(mockDevice);
        mockRepository.save.mockResolvedValue({
          ...mockDevice,
          failedAttempts: 3,
          lastFailedAttemptAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .post('/device-tracker/device-123/failed-attempt')
          .expect(200);

        expect(response.body.message).toBe('Failed attempt recorded');
      });
    });

    describe('POST /device-tracker/:id/successful-login', () => {
      it('should record a successful login', async () => {
        const mockDevice: DeviceTracker = {
          id: 'device-123',
          failedAttempts: 3,
        } as DeviceTracker;

        mockRepository.findOneBy.mockResolvedValue(mockDevice);
        mockRepository.save.mockResolvedValue({
          ...mockDevice,
          failedAttempts: 0,
          lastSuccessfulLoginAt: new Date(),
          lastSeenAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .post('/device-tracker/device-123/successful-login')
          .expect(200);

        expect(response.body.message).toBe('Successful login recorded');
      });
    });
  });

  describe('Session Management Endpoints', () => {
    describe('POST /device-tracker/sessions', () => {
      it('should create a new session', async () => {
        const sessionData = {
          deviceId: 'device-123',
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        };

        const mockSession = {
          token: 'session-token-123',
          deviceId: sessionData.deviceId,
          userId: sessionData.userId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        mockDeviceSessionService.createSession.mockResolvedValue(mockSession);

        const response = await request(app.getHttpServer())
          .post('/device-tracker/sessions')
          .send(sessionData)
          .expect(201);

        expect(response.body.token).toBe('session-token-123');
        expect(response.body.deviceId).toBe(sessionData.deviceId);
      });
    });

    describe('GET /device-tracker/sessions/:token', () => {
      it('should return session data', async () => {
        const mockSession = {
          token: 'session-token-123',
          deviceId: 'device-123',
          userId: 'user-123',
          isActive: true,
        };

        mockDeviceSessionService.getSession.mockResolvedValue(mockSession);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/sessions/session-token-123')
          .expect(200);

        expect(response.body).toMatchObject(mockSession);
      });

      it('should return error for non-existent session', async () => {
        mockDeviceSessionService.getSession.mockResolvedValue(null);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/sessions/invalid-token')
          .expect(200);

        expect(response.body.error).toBe('Session not found or expired');
      });
    });

    describe('DELETE /device-tracker/sessions/:token', () => {
      it('should terminate a session', async () => {
        mockDeviceSessionService.terminateSession.mockResolvedValue(undefined);

        await request(app.getHttpServer())
          .delete('/device-tracker/sessions/session-token-123')
          .expect(204);

        expect(mockDeviceSessionService.terminateSession).toHaveBeenCalledWith(
          'session-token-123',
        );
      });
    });

    describe('GET /device-tracker/sessions/summary', () => {
      it('should return session summary', async () => {
        const mockSummary = {
          totalSessions: 150,
          activeSessions: 45,
          suspiciousSessions: 5,
          expiredSessions: 100,
        };

        mockDeviceSessionService.getSessionSummary.mockResolvedValue(
          mockSummary,
        );

        const response = await request(app.getHttpServer())
          .get('/device-tracker/sessions/summary')
          .expect(200);

        expect(response.body).toMatchObject(mockSummary);
      });
    });
  });

  describe('Anomaly Detection Endpoints', () => {
    describe('GET /device-tracker/anomalies', () => {
      it('should return all anomalies', async () => {
        const mockAnomalies = [
          {
            deviceId: 'device-1',
            anomalyType: 'impossible_travel',
            severity: 'critical',
            description: 'Impossible travel detected',
            detectedAt: new Date(),
          },
        ];

        mockAnomalyDetectionService.getAllAnomalies.mockResolvedValue(
          mockAnomalies,
        );

        const response = await request(app.getHttpServer())
          .get('/device-tracker/anomalies')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].anomalyType).toBe('impossible_travel');
      });
    });

    describe('POST /device-tracker/anomalies/scan', () => {
      it('should trigger anomaly detection scan', async () => {
        mockAnomalyDetectionService.runAnomalyDetection.mockResolvedValue(
          undefined,
        );

        const response = await request(app.getHttpServer())
          .post('/device-tracker/anomalies/scan')
          .expect(200);

        expect(response.body.message).toBe('Anomaly detection scan triggered');
        expect(
          mockAnomalyDetectionService.runAnomalyDetection,
        ).toHaveBeenCalled();
      });
    });

    describe('GET /device-tracker/anomalies/statistics', () => {
      it('should return anomaly statistics', async () => {
        const mockStats = {
          totalAnomalies: 25,
          anomaliesByType: {
            impossible_travel: 10,
            suspicious_location: 8,
            multiple_failed_attempts: 7,
          },
          anomaliesBySeverity: {
            critical: 5,
            high: 10,
            medium: 8,
            low: 2,
          },
          recentAnomalies: [],
        };

        mockAnomalyDetectionService.getAnomalyStatistics.mockResolvedValue(
          mockStats,
        );

        const response = await request(app.getHttpServer())
          .get('/device-tracker/anomalies/statistics')
          .expect(200);

        expect(response.body).toMatchObject(mockStats);
      });
    });
  });

  describe('Notification Endpoints', () => {
    describe('GET /device-tracker/notifications', () => {
      it('should return notifications with filtering', async () => {
        const mockNotifications = [
          {
            id: 'notif-1',
            type: 'security_alert',
            message: 'Suspicious login detected',
            userId: 'user-123',
            isRead: false,
            createdAt: new Date(),
          },
        ];

        mockNotificationService.getNotifications.mockResolvedValue(
          mockNotifications,
        );

        const response = await request(app.getHttpServer())
          .get('/device-tracker/notifications')
          .query({ userId: 'user-123', unreadOnly: 'true', limit: '10' })
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(
          'user-123',
          true,
          10,
        );
      });
    });

    describe('POST /device-tracker/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        mockNotificationService.markAsRead.mockResolvedValue(undefined);

        const response = await request(app.getHttpServer())
          .post('/device-tracker/notifications/notif-123/read')
          .expect(200);

        expect(response.body.message).toBe('Notification marked as read');
        expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
          'notif-123',
        );
      });
    });
  });

  describe('Audit and Compliance Endpoints', () => {
    describe('GET /device-tracker/audit/logs', () => {
      it('should return audit logs with filters', async () => {
        const mockLogs = [
          {
            id: 'audit-1',
            eventType: 'device_created',
            description: 'New device registered',
            severity: 'info',
            timestamp: new Date(),
            userId: 'user-123',
            deviceId: 'device-123',
          },
        ];

        mockAuditService.queryAuditLogs.mockResolvedValue(mockLogs);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/audit/logs')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            eventTypes: 'device_created,device_blocked',
            userId: 'user-123',
            limit: '50',
          })
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(mockAuditService.queryAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31'),
            eventTypes: ['device_created', 'device_blocked'],
            userId: 'user-123',
            limit: 50,
          }),
        );
      });
    });

    describe('GET /device-tracker/audit/export', () => {
      it('should export audit logs in specified format', async () => {
        const mockExportData = [
          {
            timestamp: '2023-01-01T10:00:00Z',
            eventType: 'device_created',
            description: 'New device registered',
          },
        ];

        mockAuditService.exportAuditLogs.mockResolvedValue(mockExportData);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/audit/export')
          .query({ format: 'json', startDate: '2023-01-01' })
          .expect(200);

        expect(response.body.data).toEqual(mockExportData);
        expect(response.body.format).toBe('json');
        expect(response.body).toHaveProperty('exportedAt');
      });
    });

    describe('GET /device-tracker/audit/compliance-report', () => {
      it('should return compliance report', async () => {
        const mockReport = {
          totalEvents: 1000,
          securityEvents: 150,
          complianceScore: 85,
          recommendations: [
            'Increase monitoring frequency',
            'Review access policies',
          ],
        };

        mockAuditService.getComplianceReport.mockResolvedValue(mockReport);

        const response = await request(app.getHttpServer())
          .get('/device-tracker/audit/compliance-report')
          .query({ startDate: '2023-01-01', endDate: '2023-12-31' })
          .expect(200);

        expect(response.body).toMatchObject(mockReport);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockRepository.findOneBy.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await request(app.getHttpServer())
        .get('/device-tracker/device-123')
        .expect(500);
    });

    it('should validate request parameters', async () => {
      await request(app.getHttpServer())
        .get('/device-tracker/risk-level/INVALID_LEVEL')
        .expect(400);
    });

    it('should handle missing required fields in POST requests', async () => {
      await request(app.getHttpServer())
        .post('/device-tracker')
        .send({}) // Empty body
        .expect(400);
    });
  });

  describe('Security Guard Integration', () => {
    it('should apply security guard to all endpoints', async () => {
      // Reset the guard mock to return false
      mockSecurityGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).get('/device-tracker').expect(403);

      expect(mockSecurityGuard.canActivate).toHaveBeenCalled();
    });

    it('should allow access when security guard passes', async () => {
      mockSecurityGuard.canActivate.mockReturnValue(true);
      mockRepository.find.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      await request(app.getHttpServer()).get('/device-tracker').expect(200);

      expect(mockSecurityGuard.canActivate).toHaveBeenCalled();
    });
  });
});
