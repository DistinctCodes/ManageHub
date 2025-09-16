import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import * as request from 'supertest';

import { ApiPingMonitorModule } from './api-ping-monitor.module';
import { ApiEndpoint, EndpointStatus, HttpMethod, ApiProvider } from './entities/api-endpoint.entity';
import { PingResult, PingStatus } from './entities/ping-result.entity';
import { ApiMonitorService } from './services/api-monitor.service';
import { ApiNotificationService } from './services/api-notification.service';

describe('API Ping Monitor E2E', () => {
  let app: INestApplication;
  let endpointRepository: Repository<ApiEndpoint>;
  let pingResultRepository: Repository<PingResult>;
  let monitorService: ApiMonitorService;
  let notificationService: ApiNotificationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ApiEndpoint, PingResult],
          synchronize: true,
          logging: false,
        }),
        ScheduleModule.forRoot(),
        ApiPingMonitorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    await app.init();

    endpointRepository = moduleFixture.get('ApiEndpointRepository');
    pingResultRepository = moduleFixture.get('PingResultRepository');
    monitorService = moduleFixture.get(ApiMonitorService);
    notificationService = moduleFixture.get(ApiNotificationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await pingResultRepository.clear();
    await endpointRepository.clear();
  });

  describe('Complete Monitoring Workflow', () => {
    it('should handle a complete API monitoring lifecycle', async () => {
      // Phase 1: Setup - Create multiple endpoints for different providers
      const endpoints = [];
      
      // Create Stripe endpoint
      const stripeResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Stripe API Status',
          description: 'Monitors Stripe API health',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.STRIPE,
          intervalSeconds: 60,
          timeoutMs: 10000,
          retryAttempts: 2,
          enableAlerts: true,
          alertConfig: {
            consecutiveFailures: 2,
            responseTimeThresholdMs: 3000,
            uptimeThreshold: 98,
            emailNotifications: ['admin@stripe-monitor.com'],
          },
          createdBy: 'e2e-test-admin',
        })
        .expect(201);

      endpoints.push(stripeResponse.body);

      // Create Google endpoint with different configuration
      const googleResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Google API Health',
          description: 'Monitors Google API availability',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.GOOGLE,
          intervalSeconds: 120,
          timeoutMs: 15000,
          retryAttempts: 3,
          enableAlerts: true,
          alertConfig: {
            consecutiveFailures: 3,
            responseTimeThresholdMs: 5000,
            uptimeThreshold: 99,
            emailNotifications: ['google-alerts@company.com'],
          },
          createdBy: 'e2e-test-admin',
        })
        .expect(201);

      endpoints.push(googleResponse.body);

      // Create a failing endpoint for testing error scenarios
      const failingResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Failing Test Endpoint',
          description: 'Endpoint that always fails for testing',
          url: 'https://httpbin.org/status/500',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 30,
          timeoutMs: 5000,
          retryAttempts: 1,
          enableAlerts: true,
          alertConfig: {
            consecutiveFailures: 1,
            responseTimeThresholdMs: 2000,
            uptimeThreshold: 95,
            emailNotifications: ['alerts@test.com'],
          },
          createdBy: 'e2e-test-admin',
        })
        .expect(201);

      endpoints.push(failingResponse.body);

      // Phase 2: Verify endpoints were created correctly
      const allEndpointsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/endpoints')
        .expect(200);

      expect(allEndpointsResponse.body.total).toBe(3);
      expect(allEndpointsResponse.body.endpoints).toHaveLength(3);

      // Phase 3: Manual testing of successful endpoints
      for (const endpoint of endpoints.slice(0, 2)) { // Skip failing endpoint for now
        const pingResponse = await request(app.getHttpServer())
          .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
          .send({
            endpointId: endpoint.id,
            saveResult: true,
            includeDetails: true,
          })
          .expect(200);

        expect(pingResponse.body.endpointId).toBe(endpoint.id);
        expect(pingResponse.body.isSuccess).toBe(true);
        expect(pingResponse.body.status).toBe(PingStatus.SUCCESS);
        expect(pingResponse.body).toHaveProperty('responseTimeMs');
      }

      // Phase 4: Test failing endpoint
      const failingEndpoint = endpoints[2];
      const failingPingResponse = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${failingEndpoint.id}`)
        .send({
          endpointId: failingEndpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(failingPingResponse.body.endpointId).toBe(failingEndpoint.id);
      expect(failingPingResponse.body.isSuccess).toBe(false);
      expect(failingPingResponse.body.status).toBe(PingStatus.HTTP_ERROR);

      // Phase 5: Bulk operations testing
      const bulkPingResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: endpoints.map(e => e.id),
          saveResults: true,
          includeDetails: false,
        })
        .expect(200);

      expect(bulkPingResponse.body).toHaveLength(3);
      
      // First two should succeed, last should fail
      expect(bulkPingResponse.body[0].isSuccess).toBe(true);
      expect(bulkPingResponse.body[1].isSuccess).toBe(true);
      expect(bulkPingResponse.body[2].isSuccess).toBe(false);

      // Phase 6: Verify ping results were saved
      const resultsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ limit: 100 })
        .expect(200);

      expect(resultsResponse.body.results.length).toBeGreaterThan(0);

      // Check specific endpoint results
      for (const endpoint of endpoints) {
        const endpointResultsResponse = await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}/results`)
          .query({ limit: 10 })
          .expect(200);

        expect(endpointResultsResponse.body.results.length).toBeGreaterThan(0);
      }

      // Phase 7: Analytics and reporting testing
      const statisticsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(statisticsResponse.body).toMatchObject({
        total: 3,
        active: 3,
        inactive: 0,
        byProvider: {
          stripe: 1,
          google: 1,
          custom: 1,
        },
        averageUptime: expect.any(Number),
        averageResponseTime: expect.any(Number),
      });

      // Test uptime analytics
      const uptimeAnalyticsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/uptime')
        .query({ period: '1h' })
        .expect(200);

      expect(uptimeAnalyticsResponse.body).toHaveLength(3);
      uptimeAnalyticsResponse.body.forEach((metric: any) => {
        expect(metric).toMatchObject({
          endpointId: expect.any(String),
          endpointName: expect.any(String),
          url: expect.any(String),
          provider: expect.any(String),
          uptimePercentage: expect.any(Number),
          totalChecks: expect.any(Number),
          successfulChecks: expect.any(Number),
          failedChecks: expect.any(Number),
        });
      });

      // Test performance analytics
      const performanceAnalyticsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/performance')
        .query({ period: '1h' })
        .expect(200);

      expect(performanceAnalyticsResponse.body.length).toBeGreaterThan(0);

      // Test incident analytics
      const incidentAnalyticsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/incidents')
        .query({ period: '1h' })
        .expect(200);

      expect(incidentAnalyticsResponse.body).toHaveLength(3);

      // Phase 8: Endpoint management operations
      const successfulEndpoint = endpoints[0];

      // Update endpoint configuration
      const updateResponse = await request(app.getHttpServer())
        .put(`/api-ping-monitor/endpoints/${successfulEndpoint.id}`)
        .send({
          name: 'Updated Stripe API Monitor',
          description: 'Updated description for comprehensive monitoring',
          intervalSeconds: 90,
          alertConfig: {
            consecutiveFailures: 3,
            responseTimeThresholdMs: 4000,
            uptimeThreshold: 99.5,
            emailNotifications: ['updated-alerts@company.com'],
          },
        })
        .expect(200);

      expect(updateResponse.body.name).toBe('Updated Stripe API Monitor');
      expect(updateResponse.body.intervalSeconds).toBe(90);

      // Test status toggle
      await request(app.getHttpServer())
        .patch(`/api-ping-monitor/endpoints/${successfulEndpoint.id}/status`)
        .send({ status: EndpointStatus.PAUSED })
        .expect(200);

      // Verify status change
      const pausedEndpointResponse = await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${successfulEndpoint.id}`)
        .expect(200);

      expect(pausedEndpointResponse.body.status).toBe(EndpointStatus.PAUSED);

      // Reactivate endpoint
      await request(app.getHttpServer())
        .patch(`/api-ping-monitor/endpoints/${successfulEndpoint.id}/status`)
        .send({ status: EndpointStatus.ACTIVE })
        .expect(200);

      // Phase 9: Provider-specific operations
      const stripeEndpointsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/endpoints/provider/stripe')
        .expect(200);

      expect(stripeEndpointsResponse.body).toHaveLength(1);
      expect(stripeEndpointsResponse.body[0].provider).toBe(ApiProvider.STRIPE);

      // Test preset endpoint creation
      const presetResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints/presets/github')
        .send({ createdBy: 'e2e-test-preset' })
        .expect(201);

      expect(presetResponse.body.length).toBeGreaterThan(0);

      // Phase 10: Historical data testing
      for (const endpoint of endpoints) {
        const historyResponse = await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}/history`)
          .query({ days: 1 })
          .expect(200);

        expect(historyResponse.body.endpoint.id).toBe(endpoint.id);
        expect(historyResponse.body.history).toBeInstanceOf(Array);
      }

      // Phase 11: Comparison analytics testing
      const comparisonResponse = await request(app.getHttpServer())
        .get(`/api-ping-monitor/analytics/comparison/${successfulEndpoint.id}`)
        .query({ current: '1h', previous: '1h' })
        .expect(200);

      expect(comparisonResponse.body).toMatchObject({
        current: expect.any(Object),
        previous: expect.any(Object),
        change: expect.any(Object),
      });

      // Phase 12: Bulk operations
      const bulkUpdateResponse = await request(app.getHttpServer())
        .patch('/api-ping-monitor/endpoints/bulk-update')
        .send({
          endpointIds: endpoints.map(e => e.id),
          updatedBy: 'e2e-bulk-test',
          timeoutMs: 20000,
        })
        .expect(200);

      expect(bulkUpdateResponse.body.updated).toBe(3);
      expect(bulkUpdateResponse.body.errors).toHaveLength(0);

      // Phase 13: Final verification of system state
      const finalStatsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(finalStatsResponse.body.total).toBe(4); // 3 original + 1 from preset
      expect(finalStatsResponse.body.active).toBe(4);

      // Verify all endpoints are accessible
      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .expect(200);
      }

      // Phase 14: Cleanup verification
      let deletedCount = 0;
      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .delete(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .expect(204);
        deletedCount++;

        // Verify deletion
        await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .expect(404);
      }

      expect(deletedCount).toBe(3);

      // Final statistics should show reduced count
      const cleanupStatsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(cleanupStatsResponse.body.total).toBe(1); // Only preset endpoint remains
    }, 60000); // Extended timeout for comprehensive test
  });

  describe('Real-time Monitoring Simulation', () => {
    it('should handle concurrent monitoring activities', async () => {
      // Create multiple endpoints
      const endpointPromises = [];
      for (let i = 0; i < 5; i++) {
        endpointPromises.push(
          request(app.getHttpServer())
            .post('/api-ping-monitor/endpoints')
            .send({
              name: `Concurrent Endpoint ${i}`,
              description: `Concurrent testing endpoint ${i}`,
              url: `https://httpbin.org/delay/${i % 3}`, // Varying response times
              method: HttpMethod.GET,
              provider: ApiProvider.CUSTOM,
              intervalSeconds: 30,
              retryAttempts: 1,
              enableAlerts: true,
              createdBy: 'concurrent-test',
            })
        );
      }

      const endpoints = await Promise.all(endpointPromises);
      endpoints.forEach(response => expect(response.status).toBe(201));

      // Simulate concurrent ping operations
      const pingPromises = [];
      for (const endpointResponse of endpoints) {
        pingPromises.push(
          request(app.getHttpServer())
            .post(`/api-ping-monitor/ping/manual/${endpointResponse.body.id}`)
            .send({
              endpointId: endpointResponse.body.id,
              saveResult: true,
              includeDetails: true,
            })
        );
      }

      const pingResults = await Promise.all(pingPromises);
      pingResults.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('endpointId');
        expect(response.body).toHaveProperty('isSuccess');
      });

      // Verify all results were saved properly
      const allResultsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ limit: 100 })
        .expect(200);

      expect(allResultsResponse.body.results.length).toBeGreaterThanOrEqual(5);
    }, 30000);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures and recovery gracefully', async () => {
      // Create endpoint that will fail initially
      const endpointResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Recovery Test Endpoint',
          description: 'Tests error handling and recovery',
          url: 'https://httpbin.org/status/503', // Service unavailable
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 30,
          retryAttempts: 2,
          enableAlerts: true,
          alertConfig: {
            consecutiveFailures: 1,
            responseTimeThresholdMs: 5000,
          },
          createdBy: 'recovery-test',
        })
        .expect(201);

      const endpoint = endpointResponse.body;

      // Trigger multiple failures
      for (let i = 0; i < 3; i++) {
        const failResponse = await request(app.getHttpServer())
          .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
          .send({
            endpointId: endpoint.id,
            saveResult: true,
            includeDetails: true,
          })
          .expect(200);

        expect(failResponse.body.isSuccess).toBe(false);
        expect(failResponse.body.status).toBe(PingStatus.HTTP_ERROR);
      }

      // Update endpoint to a working URL (simulate recovery)
      await request(app.getHttpServer())
        .put(`/api-ping-monitor/endpoints/${endpoint.id}`)
        .send({
          url: 'https://httpbin.org/status/200', // Now working
        })
        .expect(200);

      // Test recovery
      const recoveryResponse = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(recoveryResponse.body.isSuccess).toBe(true);
      expect(recoveryResponse.body.status).toBe(PingStatus.SUCCESS);

      // Verify incident metrics show the failure history
      const incidentResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/incidents')
        .query({ period: '1h', endpointId: endpoint.id })
        .expect(200);

      expect(incidentResponse.body).toHaveLength(1);
      expect(incidentResponse.body[0].totalIncidents).toBeGreaterThan(0);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume ping operations efficiently', async () => {
      // Create endpoint for load testing
      const endpointResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Load Test Endpoint',
          description: 'Endpoint for performance testing',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 10,
          createdBy: 'load-test',
        })
        .expect(201);

      const endpoint = endpointResponse.body;

      // Perform multiple pings rapidly
      const startTime = Date.now();
      const pingPromises = [];
      for (let i = 0; i < 10; i++) {
        pingPromises.push(
          request(app.getHttpServer())
            .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
            .send({
              endpointId: endpoint.id,
              saveResult: true,
              includeDetails: false,
            })
        );
      }

      const results = await Promise.all(pingPromises);
      const endTime = Date.now();
      
      // Verify all pings completed successfully
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.isSuccess).toBe(true);
      });

      // Verify reasonable performance (all pings completed within 30 seconds)
      expect(endTime - startTime).toBeLessThan(30000);

      // Verify all results were saved
      const resultsResponse = await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${endpoint.id}/results`)
        .query({ limit: 20 })
        .expect(200);

      expect(resultsResponse.body.results.length).toBeGreaterThanOrEqual(10);
    }, 45000);
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create endpoint
      const endpointResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Consistency Test Endpoint',
          description: 'Tests data consistency',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 60,
          createdBy: 'consistency-test',
        })
        .expect(201);

      const endpoint = endpointResponse.body;

      // Perform pings and track results
      const pingCount = 5;
      for (let i = 0; i < pingCount; i++) {
        await request(app.getHttpServer())
          .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
          .send({
            endpointId: endpoint.id,
            saveResult: true,
            includeDetails: true,
          })
          .expect(200);
      }

      // Verify data consistency
      const resultsResponse = await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${endpoint.id}/results`)
        .query({ limit: 10 })
        .expect(200);

      expect(resultsResponse.body.results).toHaveLength(pingCount);

      // Verify analytics consistency
      const uptimeResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/uptime')
        .query({ period: '1h', endpointId: endpoint.id })
        .expect(200);

      expect(uptimeResponse.body).toHaveLength(1);
      expect(uptimeResponse.body[0].totalChecks).toBe(pingCount);
      expect(uptimeResponse.body[0].successfulChecks).toBe(pingCount);
      expect(uptimeResponse.body[0].uptimePercentage).toBe(100);

      // Verify statistics consistency
      const statsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(statsResponse.body.total).toBeGreaterThanOrEqual(1);

      // Test endpoint deletion and orphaned data cleanup
      await request(app.getHttpServer())
        .delete(`/api-ping-monitor/endpoints/${endpoint.id}`)
        .expect(204);

      // Verify ping results are cleaned up (cascade delete)
      const orphanedResultsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ endpointId: endpoint.id })
        .expect(200);

      expect(orphanedResultsResponse.body.results).toHaveLength(0);
    });
  });
});