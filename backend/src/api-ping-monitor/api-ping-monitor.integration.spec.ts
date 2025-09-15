import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';

import { ApiPingMonitorModule } from './api-ping-monitor.module';
import {
  ApiEndpoint,
  EndpointStatus,
  HttpMethod,
  ApiProvider,
} from './entities/api-endpoint.entity';
import { PingResult, PingStatus } from './entities/ping-result.entity';
import { CreateApiEndpointDto } from './dto/api-endpoint.dto';

describe('ApiPingMonitorModule (Integration)', () => {
  let app: INestApplication;
  let endpointRepository: Repository<ApiEndpoint>;
  let pingResultRepository: Repository<PingResult>;

  const testEndpointData: CreateApiEndpointDto = {
    name: 'Test Integration Endpoint',
    description: 'Integration test endpoint',
    url: 'https://httpbin.org/status/200',
    method: HttpMethod.GET,
    provider: ApiProvider.CUSTOM,
    intervalSeconds: 300,
    timeoutMs: 30000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    enableAlerts: true,
    alertConfig: {
      consecutiveFailures: 3,
      responseTimeThresholdMs: 5000,
      uptimeThreshold: 95,
      emailNotifications: ['test@example.com'],
    },
    createdBy: 'integration-test',
  };

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
        ApiPingMonitorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();

    endpointRepository = moduleFixture.get('ApiEndpointRepository');
    pingResultRepository = moduleFixture.get('PingResultRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await pingResultRepository.clear();
    await endpointRepository.clear();
  });

  describe('Endpoint Management Integration', () => {
    describe('POST /api-ping-monitor/endpoints', () => {
      it('should create a new endpoint', async () => {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send(testEndpointData)
          .expect(201);

        expect(response.body).toMatchObject({
          name: testEndpointData.name,
          url: testEndpointData.url,
          method: testEndpointData.method,
          provider: testEndpointData.provider,
          isActive: true,
          status: EndpointStatus.ACTIVE,
        });

        expect(response.body.id).toBeDefined();
        expect(response.body.createdAt).toBeDefined();

        // Verify in database
        const endpointInDb = await endpointRepository.findOne({
          where: { id: response.body.id },
        });
        expect(endpointInDb).toBeDefined();
        expect(endpointInDb.name).toBe(testEndpointData.name);
      });

      it('should validate required fields', async () => {
        const invalidData = {
          name: '', // Empty name
          url: 'invalid-url', // Invalid URL
          method: 'INVALID_METHOD', // Invalid HTTP method
        };

        await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send(invalidData)
          .expect(400);
      });

      it('should prevent duplicate URLs', async () => {
        // Create first endpoint
        await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send(testEndpointData)
          .expect(201);

        // Try to create duplicate
        await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send({
            ...testEndpointData,
            name: 'Different Name', // Different name but same URL
          })
          .expect(400);
      });
    });

    describe('GET /api-ping-monitor/endpoints', () => {
      it('should retrieve endpoints with pagination', async () => {
        // Create multiple endpoints
        const endpoints = [];
        for (let i = 0; i < 3; i++) {
          const endpoint = await endpointRepository.save(
            endpointRepository.create({
              ...testEndpointData,
              name: `Test Endpoint ${i}`,
              url: `https://httpbin.org/status/20${i}`,
            }),
          );
          endpoints.push(endpoint);
        }

        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints')
          .query({ limit: 2, offset: 0 })
          .expect(200);

        expect(response.body.endpoints).toHaveLength(2);
        expect(response.body.total).toBe(3);
        expect(response.body.totalPages).toBe(2);
        expect(response.body.page).toBe(1);
      });

      it('should filter endpoints by search term', async () => {
        // Create endpoints with different names
        await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            name: 'Google API Endpoint',
            url: 'https://google.com',
          }),
        );

        await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            name: 'Stripe API Endpoint',
            url: 'https://stripe.com',
          }),
        );

        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints')
          .query({ search: 'Google' })
          .expect(200);

        expect(response.body.endpoints).toHaveLength(1);
        expect(response.body.endpoints[0].name).toContain('Google');
      });
    });

    describe('GET /api-ping-monitor/endpoints/:id', () => {
      it('should retrieve a specific endpoint', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create(testEndpointData),
        );

        const response = await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .expect(200);

        expect(response.body.id).toBe(endpoint.id);
        expect(response.body.name).toBe(testEndpointData.name);
      });

      it('should return 404 for non-existent endpoint', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';

        await request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${fakeId}`)
          .expect(404);
      });

      it('should return 400 for invalid UUID', async () => {
        await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints/invalid-uuid')
          .expect(400);
      });
    });

    describe('PUT /api-ping-monitor/endpoints/:id', () => {
      it('should update an endpoint', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create(testEndpointData),
        );

        const updateData = {
          name: 'Updated Endpoint Name',
          description: 'Updated description',
          timeoutMs: 60000,
        };

        const response = await request(app.getHttpServer())
          .put(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe(updateData.name);
        expect(response.body.description).toBe(updateData.description);
        expect(response.body.timeoutMs).toBe(updateData.timeoutMs);

        // Verify in database
        const updatedEndpoint = await endpointRepository.findOne({
          where: { id: endpoint.id },
        });
        expect(updatedEndpoint.name).toBe(updateData.name);
      });

      it('should prevent updating to duplicate URL', async () => {
        const endpoint1 = await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            url: 'https://api1.example.com',
          }),
        );

        const endpoint2 = await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            name: 'Second Endpoint',
            url: 'https://api2.example.com',
          }),
        );

        await request(app.getHttpServer())
          .put(`/api-ping-monitor/endpoints/${endpoint2.id}`)
          .send({ url: endpoint1.url })
          .expect(400);
      });
    });

    describe('DELETE /api-ping-monitor/endpoints/:id', () => {
      it('should delete an endpoint', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create(testEndpointData),
        );

        await request(app.getHttpServer())
          .delete(`/api-ping-monitor/endpoints/${endpoint.id}`)
          .expect(204);

        // Verify deletion in database
        const deletedEndpoint = await endpointRepository.findOne({
          where: { id: endpoint.id },
        });
        expect(deletedEndpoint).toBeNull();
      });

      it('should return 404 when deleting non-existent endpoint', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';

        await request(app.getHttpServer())
          .delete(`/api-ping-monitor/endpoints/${fakeId}`)
          .expect(404);
      });
    });

    describe('PATCH /api-ping-monitor/endpoints/:id/status', () => {
      it('should toggle endpoint status', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            status: EndpointStatus.ACTIVE,
          }),
        );

        const response = await request(app.getHttpServer())
          .patch(`/api-ping-monitor/endpoints/${endpoint.id}/status`)
          .send({ status: EndpointStatus.PAUSED })
          .expect(200);

        expect(response.body.status).toBe(EndpointStatus.PAUSED);

        // Verify in database
        const updatedEndpoint = await endpointRepository.findOne({
          where: { id: endpoint.id },
        });
        expect(updatedEndpoint.status).toBe(EndpointStatus.PAUSED);
      });
    });

    describe('PATCH /api-ping-monitor/endpoints/:id/active', () => {
      it('should toggle endpoint active status', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            isActive: true,
          }),
        );

        const response = await request(app.getHttpServer())
          .patch(`/api-ping-monitor/endpoints/${endpoint.id}/active`)
          .send({ isActive: false })
          .expect(200);

        expect(response.body.isActive).toBe(false);

        // Verify in database
        const updatedEndpoint = await endpointRepository.findOne({
          where: { id: endpoint.id },
        });
        expect(updatedEndpoint.isActive).toBe(false);
      });
    });
  });

  describe('Provider Management Integration', () => {
    describe('GET /api-ping-monitor/endpoints/provider/:provider', () => {
      it('should retrieve endpoints by provider', async () => {
        await endpointRepository.save([
          endpointRepository.create({
            ...testEndpointData,
            name: 'Stripe Endpoint 1',
            provider: ApiProvider.STRIPE,
            url: 'https://stripe1.example.com',
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Stripe Endpoint 2',
            provider: ApiProvider.STRIPE,
            url: 'https://stripe2.example.com',
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Google Endpoint',
            provider: ApiProvider.GOOGLE,
            url: 'https://google.example.com',
          }),
        ]);

        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints/provider/stripe')
          .expect(200);

        expect(response.body).toHaveLength(2);
        response.body.forEach((endpoint: any) => {
          expect(endpoint.provider).toBe(ApiProvider.STRIPE);
        });
      });
    });

    describe('POST /api-ping-monitor/endpoints/presets/:provider', () => {
      it('should create preset endpoints for Stripe', async () => {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints/presets/stripe')
          .send({ createdBy: 'integration-test' })
          .expect(201);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);

        // Verify endpoints were created in database
        const stripeEndpoints = await endpointRepository.find({
          where: { provider: ApiProvider.STRIPE },
        });
        expect(stripeEndpoints.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Manual Ping Operations Integration', () => {
    describe('POST /api-ping-monitor/ping/manual/:endpointId', () => {
      it('should perform manual ping and save result', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            ...testEndpointData,
            url: 'https://httpbin.org/status/200', // Reliable test endpoint
          }),
        );

        const manualPingData = {
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        };

        const response = await request(app.getHttpServer())
          .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
          .send(manualPingData)
          .expect(200);

        expect(response.body.endpointId).toBe(endpoint.id);
        expect(response.body.endpointName).toBe(endpoint.name);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('isSuccess');

        // Verify ping result was saved
        const pingResults = await pingResultRepository.find({
          where: { endpointId: endpoint.id },
        });
        expect(pingResults.length).toBeGreaterThan(0);
      });
    });

    describe('POST /api-ping-monitor/ping/bulk', () => {
      it('should perform bulk ping on multiple endpoints', async () => {
        const endpoints = await endpointRepository.save([
          endpointRepository.create({
            ...testEndpointData,
            name: 'Endpoint 1',
            url: 'https://httpbin.org/status/200',
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Endpoint 2',
            url: 'https://httpbin.org/status/201',
          }),
        ]);

        const bulkPingData = {
          endpointIds: endpoints.map((e) => e.id),
          saveResults: true,
          includeDetails: false,
        };

        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/ping/bulk')
          .send(bulkPingData)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toHaveLength(2);

        response.body.forEach((result: any) => {
          expect(result).toHaveProperty('endpointId');
          expect(result).toHaveProperty('status');
          expect(result).toHaveProperty('isSuccess');
        });
      });
    });

    describe('POST /api-ping-monitor/ping/all-active', () => {
      it('should ping all active endpoints', async () => {
        await endpointRepository.save([
          endpointRepository.create({
            ...testEndpointData,
            name: 'Active Endpoint 1',
            url: 'https://httpbin.org/status/200',
            isActive: true,
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Active Endpoint 2',
            url: 'https://httpbin.org/status/201',
            isActive: true,
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Inactive Endpoint',
            url: 'https://httpbin.org/status/202',
            isActive: false,
          }),
        ]);

        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/ping/all-active')
          .send({ triggeredBy: 'integration-test' })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toHaveLength(2); // Only active endpoints
      });
    });
  });

  describe('Statistics and Analytics Integration', () => {
    describe('GET /api-ping-monitor/statistics', () => {
      it('should retrieve comprehensive statistics', async () => {
        // Create endpoints with different statuses
        await endpointRepository.save([
          endpointRepository.create({
            ...testEndpointData,
            name: 'Active Endpoint',
            isActive: true,
            status: EndpointStatus.ACTIVE,
          }),
          endpointRepository.create({
            ...testEndpointData,
            name: 'Paused Endpoint',
            url: 'https://paused.example.com',
            isActive: false,
            status: EndpointStatus.PAUSED,
          }),
        ]);

        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/statistics')
          .expect(200);

        expect(response.body).toMatchObject({
          total: 2,
          active: 1,
          inactive: 1,
          byProvider: expect.any(Object),
          byStatus: expect.any(Object),
          averageUptime: expect.any(Number),
          averageResponseTime: expect.any(Number),
        });
      });
    });

    describe('GET /api-ping-monitor/analytics/uptime', () => {
      it('should retrieve uptime analytics with period filter', async () => {
        const endpoint = await endpointRepository.save(
          endpointRepository.create(testEndpointData),
        );

        // Create some ping results
        await pingResultRepository.save([
          pingResultRepository.create({
            endpointId: endpoint.id,
            status: PingStatus.SUCCESS,
            httpStatusCode: 200,
            responseTimeMs: 150,
            isSuccess: true,
            createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          }),
          pingResultRepository.create({
            endpointId: endpoint.id,
            status: PingStatus.TIMEOUT,
            isSuccess: false,
            createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          }),
        ]);

        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/uptime')
          .query({ period: '24h', endpointId: endpoint.id })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toMatchObject({
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          uptimePercentage: expect.any(Number),
          totalChecks: expect.any(Number),
          successfulChecks: expect.any(Number),
          failedChecks: expect.any(Number),
        });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database constraints properly', async () => {
      // Create first endpoint
      await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send(testEndpointData)
        .expect(201);

      // Try to create duplicate URL - should fail
      await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          ...testEndpointData,
          name: 'Different Name',
        })
        .expect(400);
    });

    it('should handle malformed requests gracefully', async () => {
      // Missing required fields
      await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({})
        .expect(400);

      // Invalid enum values
      await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          ...testEndpointData,
          method: 'INVALID_METHOD',
          provider: 'INVALID_PROVIDER',
        })
        .expect(400);
    });

    it('should handle concurrent requests properly', async () => {
      const promises = [];

      // Create multiple endpoints concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api-ping-monitor/endpoints')
            .send({
              ...testEndpointData,
              name: `Concurrent Endpoint ${i}`,
              url: `https://concurrent${i}.example.com`,
            }),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify all were created
      const endpoints = await endpointRepository.find();
      expect(endpoints).toHaveLength(5);
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete a full monitoring workflow', async () => {
      // 1. Create an endpoint
      const createResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          ...testEndpointData,
          url: 'https://httpbin.org/status/200',
        })
        .expect(201);

      const endpointId = createResponse.body.id;

      // 2. Perform manual ping
      await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpointId}`)
        .send({
          endpointId,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      // 3. Check ping results were saved
      const resultsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ endpointId })
        .expect(200);

      expect(resultsResponse.body.results).toHaveLength(1);

      // 4. Get endpoint history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${endpointId}/history`)
        .query({ days: 1 })
        .expect(200);

      expect(historyResponse.body.endpoint.id).toBe(endpointId);
      expect(historyResponse.body.history).toBeInstanceOf(Array);

      // 5. Update endpoint
      await request(app.getHttpServer())
        .put(`/api-ping-monitor/endpoints/${endpointId}`)
        .send({
          name: 'Updated Integration Test Endpoint',
          description: 'Updated during integration test',
        })
        .expect(200);

      // 6. Disable endpoint
      await request(app.getHttpServer())
        .patch(`/api-ping-monitor/endpoints/${endpointId}/active`)
        .send({ isActive: false })
        .expect(200);

      // 7. Verify statistics reflect changes
      const statsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(statsResponse.body.total).toBe(1);
      expect(statsResponse.body.inactive).toBe(1);

      // 8. Delete endpoint
      await request(app.getHttpServer())
        .delete(`/api-ping-monitor/endpoints/${endpointId}`)
        .expect(204);

      // 9. Verify deletion
      await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${endpointId}`)
        .expect(404);
    });
  });
});
