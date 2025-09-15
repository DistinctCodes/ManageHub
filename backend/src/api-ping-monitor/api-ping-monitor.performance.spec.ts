import { Test, TestingModule } from '@nestjs/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';

import { ApiPingMonitorModule } from './api-ping-monitor.module';
import {
  ApiEndpoint,
  HttpMethod,
  ApiProvider,
} from './entities/api-endpoint.entity';
import { PingResult, PingStatus } from './entities/ping-result.entity';
import { ApiMonitorService } from './services/api-monitor.service';
import { ApiEndpointService } from './services/api-endpoint.service';
import { ApiAnalyticsService } from './services/api-analytics.service';

describe('API Ping Monitor Performance Tests', () => {
  let app: INestApplication;
  let endpointRepository: Repository<ApiEndpoint>;
  let pingResultRepository: Repository<PingResult>;
  let monitorService: ApiMonitorService;
  let endpointService: ApiEndpointService;
  let analyticsService: ApiAnalyticsService;

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
    await app.init();

    endpointRepository = moduleFixture.get('ApiEndpointRepository');
    pingResultRepository = moduleFixture.get('PingResultRepository');
    monitorService = moduleFixture.get(ApiMonitorService);
    endpointService = moduleFixture.get(ApiEndpointService);
    analyticsService = moduleFixture.get(ApiAnalyticsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await pingResultRepository.clear();
    await endpointRepository.clear();
  });

  describe('Bulk Operations Performance', () => {
    it('should handle creating 100 endpoints efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api-ping-monitor/endpoints')
            .send({
              name: `Performance Test Endpoint ${i}`,
              description: `Performance test endpoint number ${i}`,
              url: `https://api${i}.example.com/health`,
              method: HttpMethod.GET,
              provider: ApiProvider.CUSTOM,
              intervalSeconds: 300,
              createdBy: 'performance-test',
            }),
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time (30 seconds for 100 endpoints)
      expect(duration).toBeLessThan(30000);

      // Verify all endpoints were created
      const endpointsCount = await endpointRepository.count();
      expect(endpointsCount).toBe(100);

      console.log(
        `Created 100 endpoints in ${duration}ms (${(duration / 100).toFixed(2)}ms per endpoint)`,
      );
    }, 45000);

    it('should handle bulk ping operations efficiently', async () => {
      // Create 50 endpoints
      const endpoints = [];
      for (let i = 0; i < 50; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `Bulk Ping Test ${i}`,
            description: `Bulk ping performance test ${i}`,
            url: 'https://httpbin.org/status/200',
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            intervalSeconds: 300,
            timeoutMs: 10000,
            retryAttempts: 1,
            createdBy: 'bulk-performance-test',
          }),
        );
        endpoints.push(endpoint);
      }

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: endpoints.map((e) => e.id),
          saveResults: true,
          includeDetails: false,
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveLength(50);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(60000); // 60 seconds for 50 pings

      // Verify all ping results were saved
      const resultCount = await pingResultRepository.count();
      expect(resultCount).toBe(50);

      console.log(
        `Bulk pinged 50 endpoints in ${duration}ms (${(duration / 50).toFixed(2)}ms per ping)`,
      );
    }, 75000);

    it('should handle large dataset queries efficiently', async () => {
      // Create endpoint and many ping results
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Large Dataset Test',
          description: 'Testing large dataset performance',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 300,
          createdBy: 'large-dataset-test',
        }),
      );

      // Create 1000 ping results
      const pingResults = [];
      for (let i = 0; i < 1000; i++) {
        pingResults.push(
          pingResultRepository.create({
            endpointId: endpoint.id,
            status: i % 10 === 0 ? PingStatus.TIMEOUT : PingStatus.SUCCESS, // 10% failure rate
            httpStatusCode: i % 10 === 0 ? null : 200,
            responseTimeMs: i % 10 === 0 ? null : 100 + (i % 500),
            isSuccess: i % 10 !== 0,
            isTimeout: i % 10 === 0,
            attemptNumber: 1,
            createdAt: new Date(Date.now() - i * 60000), // Spread over time
          }),
        );
      }

      await pingResultRepository.save(pingResults);

      // Test query performance
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({
          endpointId: endpoint.id,
          limit: 100,
          offset: 0,
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.results).toHaveLength(100);
      expect(response.body.total).toBe(1000);

      // Should complete query quickly
      expect(duration).toBeLessThan(5000); // 5 seconds

      console.log(`Queried 100 results from 1000 total in ${duration}ms`);
    }, 30000);
  });

  describe('Analytics Performance', () => {
    it('should generate analytics efficiently for large datasets', async () => {
      // Create multiple endpoints with data
      const endpoints = [];
      for (let i = 0; i < 10; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `Analytics Test Endpoint ${i}`,
            description: `Analytics performance test ${i}`,
            url: `https://analytics${i}.example.com/health`,
            method: HttpMethod.GET,
            provider: i % 2 === 0 ? ApiProvider.STRIPE : ApiProvider.GOOGLE,
            intervalSeconds: 300,
            createdBy: 'analytics-performance-test',
          }),
        );
        endpoints.push(endpoint);

        // Create 100 ping results per endpoint
        const pingResults = [];
        for (let j = 0; j < 100; j++) {
          pingResults.push(
            pingResultRepository.create({
              endpointId: endpoint.id,
              status: j % 15 === 0 ? PingStatus.TIMEOUT : PingStatus.SUCCESS, // ~6.7% failure rate
              httpStatusCode: j % 15 === 0 ? null : 200,
              responseTimeMs: j % 15 === 0 ? null : 150 + (j % 300),
              isSuccess: j % 15 !== 0,
              isTimeout: j % 15 === 0,
              attemptNumber: 1,
              createdAt: new Date(Date.now() - j * 60000), // Spread over time
            }),
          );
        }
        await pingResultRepository.save(pingResults);
      }

      // Test uptime analytics performance
      const uptimeStartTime = Date.now();
      const uptimeResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/uptime')
        .query({ period: '24h' })
        .expect(200);
      const uptimeEndTime = Date.now();

      expect(uptimeResponse.body).toHaveLength(10);
      expect(uptimeEndTime - uptimeStartTime).toBeLessThan(10000);

      // Test performance analytics performance
      const perfStartTime = Date.now();
      const perfResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/analytics/performance')
        .query({ period: '24h' })
        .expect(200);
      const perfEndTime = Date.now();

      expect(perfResponse.body.length).toBeGreaterThan(0);
      expect(perfEndTime - perfStartTime).toBeLessThan(10000);

      // Test statistics performance
      const statsStartTime = Date.now();
      const statsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);
      const statsEndTime = Date.now();

      expect(statsResponse.body.total).toBe(10);
      expect(statsEndTime - statsStartTime).toBeLessThan(5000);

      console.log(`Analytics Performance:
        - Uptime analytics: ${uptimeEndTime - uptimeStartTime}ms
        - Performance analytics: ${perfEndTime - perfStartTime}ms  
        - Statistics: ${statsEndTime - statsStartTime}ms
        - Dataset: 10 endpoints, 1000 ping results`);
    }, 60000);

    it('should handle concurrent analytics requests efficiently', async () => {
      // Create test data
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Concurrent Analytics Test',
          description: 'Testing concurrent analytics performance',
          url: 'https://concurrent.example.com/health',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          intervalSeconds: 300,
          createdBy: 'concurrent-analytics-test',
        }),
      );

      // Create ping results
      const pingResults = [];
      for (let i = 0; i < 500; i++) {
        pingResults.push(
          pingResultRepository.create({
            endpointId: endpoint.id,
            status: i % 20 === 0 ? PingStatus.TIMEOUT : PingStatus.SUCCESS,
            httpStatusCode: i % 20 === 0 ? null : 200,
            responseTimeMs: i % 20 === 0 ? null : 100 + (i % 400),
            isSuccess: i % 20 !== 0,
            isTimeout: i % 20 === 0,
            attemptNumber: 1,
            createdAt: new Date(Date.now() - i * 30000),
          }),
        );
      }
      await pingResultRepository.save(pingResults);

      // Perform concurrent analytics requests
      const startTime = Date.now();
      const promises = [
        request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/uptime')
          .query({ period: '24h', endpointId: endpoint.id }),
        request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/performance')
          .query({ period: '24h', endpointId: endpoint.id }),
        request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/incidents')
          .query({ period: '24h', endpointId: endpoint.id }),
        request(app.getHttpServer())
          .get(`/api-ping-monitor/endpoints/${endpoint.id}/history`)
          .query({ days: 1 }),
        request(app.getHttpServer()).get('/api-ping-monitor/statistics'),
      ];

      const results = await Promise.all(promises);
      const endTime = Date.now();

      results.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(15000); // All should complete within 15 seconds

      console.log(
        `5 concurrent analytics requests completed in ${endTime - startTime}ms`,
      );
    }, 30000);
  });

  describe('Memory and Resource Usage', () => {
    it('should handle memory efficiently with large ping operations', async () => {
      const initialMemory = process.memoryUsage();

      // Create 20 endpoints
      const endpoints = [];
      for (let i = 0; i < 20; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `Memory Test Endpoint ${i}`,
            description: `Memory usage test ${i}`,
            url: 'https://httpbin.org/status/200',
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            intervalSeconds: 300,
            timeoutMs: 5000,
            retryAttempts: 1,
            createdBy: 'memory-test',
          }),
        );
        endpoints.push(endpoint);
      }

      // Perform multiple rounds of bulk pings
      for (let round = 0; round < 5; round++) {
        await request(app.getHttpServer())
          .post('/api-ping-monitor/ping/bulk')
          .send({
            endpointIds: endpoints.map((e) => e.id),
            saveResults: true,
            includeDetails: false,
          })
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Verify all ping results were created
      const resultCount = await pingResultRepository.count();
      expect(resultCount).toBe(100); // 20 endpoints * 5 rounds

      console.log(`Memory usage:
        - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB  
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB
        - Ping results created: ${resultCount}`);
    }, 45000);

    it('should handle database connection pooling efficiently', async () => {
      // Test many concurrent database operations
      const startTime = Date.now();
      const promises = [];

      // Create 50 concurrent endpoint creation requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api-ping-monitor/endpoints')
            .send({
              name: `DB Pool Test ${i}`,
              description: `Database connection pool test ${i}`,
              url: `https://dbpool${i}.example.com/health`,
              method: HttpMethod.GET,
              provider: ApiProvider.CUSTOM,
              intervalSeconds: 300,
              createdBy: 'db-pool-test',
            }),
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      results.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(20000);

      // Verify all were created
      const endpointCount = await endpointRepository.count();
      expect(endpointCount).toBe(50);

      console.log(
        `50 concurrent database operations completed in ${endTime - startTime}ms`,
      );
    }, 30000);
  });

  describe('Scalability Testing', () => {
    it('should scale linearly with increasing endpoint count', async () => {
      const testSizes = [10, 50, 100];
      const results = [];

      for (const size of testSizes) {
        // Clean up
        await pingResultRepository.clear();
        await endpointRepository.clear();

        // Create endpoints
        const endpoints = [];
        const createStartTime = Date.now();

        for (let i = 0; i < size; i++) {
          const endpoint = await endpointRepository.save(
            endpointRepository.create({
              name: `Scale Test ${size}-${i}`,
              description: `Scalability test with ${size} endpoints`,
              url: 'https://httpbin.org/status/200',
              method: HttpMethod.GET,
              provider: ApiProvider.CUSTOM,
              intervalSeconds: 300,
              timeoutMs: 5000,
              retryAttempts: 1,
              createdBy: 'scale-test',
            }),
          );
          endpoints.push(endpoint);
        }

        const createEndTime = Date.now();

        // Perform bulk ping
        const pingStartTime = Date.now();
        await request(app.getHttpServer())
          .post('/api-ping-monitor/ping/bulk')
          .send({
            endpointIds: endpoints.map((e) => e.id),
            saveResults: true,
            includeDetails: false,
          })
          .expect(200);
        const pingEndTime = Date.now();

        // Test analytics
        const analyticsStartTime = Date.now();
        await request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/uptime')
          .query({ period: '1h' })
          .expect(200);
        const analyticsEndTime = Date.now();

        results.push({
          size,
          createTime: createEndTime - createStartTime,
          pingTime: pingEndTime - pingStartTime,
          analyticsTime: analyticsEndTime - analyticsStartTime,
        });
      }

      // Log results for analysis
      console.log('Scalability Test Results:');
      results.forEach((result) => {
        console.log(`${result.size} endpoints:
          - Create time: ${result.createTime}ms (${(result.createTime / result.size).toFixed(2)}ms/endpoint)
          - Ping time: ${result.pingTime}ms (${(result.pingTime / result.size).toFixed(2)}ms/endpoint)  
          - Analytics time: ${result.analyticsTime}ms`);
      });

      // Verify reasonable scaling characteristics
      const create10 = results[0].createTime / 10;
      const create100 = results[2].createTime / 100;
      const scaleRatio = create100 / create10;

      // Scale ratio should be reasonable (not exponential growth)
      expect(scaleRatio).toBeLessThan(5); // Should not be more than 5x slower per endpoint
    }, 120000);
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      // Create mix of working and failing endpoints
      const endpoints = [];

      for (let i = 0; i < 20; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `Error Test Endpoint ${i}`,
            description: `Error handling performance test ${i}`,
            // Mix of working and failing URLs
            url:
              i % 2 === 0
                ? 'https://httpbin.org/status/200'
                : 'https://httpbin.org/status/500',
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            intervalSeconds: 300,
            timeoutMs: 5000,
            retryAttempts: 1,
            createdBy: 'error-performance-test',
          }),
        );
        endpoints.push(endpoint);
      }

      // Test error handling performance
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: endpoints.map((e) => e.id),
          saveResults: true,
          includeDetails: true,
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify mixed results
      const successCount = response.body.filter((r: any) => r.isSuccess).length;
      const failureCount = response.body.filter(
        (r: any) => !r.isSuccess,
      ).length;

      expect(successCount).toBe(10); // Half should succeed
      expect(failureCount).toBe(10); // Half should fail

      // Error handling should not significantly impact performance
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(
        `Error handling performance: ${duration}ms for 20 mixed endpoints (${successCount} success, ${failureCount} failures)`,
      );
    }, 45000);
  });
});
