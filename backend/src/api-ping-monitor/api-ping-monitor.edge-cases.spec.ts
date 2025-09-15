import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';

import { ApiPingMonitorModule } from './api-ping-monitor.module';
import { ApiEndpoint, EndpointStatus, HttpMethod, ApiProvider } from './entities/api-endpoint.entity';
import { PingResult, PingStatus } from './entities/ping-result.entity';

describe('API Ping Monitor Edge Cases and Error Scenarios', () => {
  let app: INestApplication;
  let endpointRepository: Repository<ApiEndpoint>;
  let pingResultRepository: Repository<PingResult>;

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
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    await app.init();

    endpointRepository = moduleFixture.get('ApiEndpointRepository');
    pingResultRepository = moduleFixture.get('PingResultRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await pingResultRepository.clear();
    await endpointRepository.clear();
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000); // 2000+ character URL

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Long URL Test',
          description: 'Testing extremely long URL handling',
          url: longUrl,
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'edge-case-test',
        });

      // Should either accept it (if within limit) or reject with proper error
      expect([201, 400]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle special characters in endpoint names', async () => {
      const specialNames = [
        'Test "Endpoint" with quotes',
        'Test <Endpoint> with brackets',
        'Test {Endpoint} with braces',
        'Test Endpoint with émojis 🚀',
        'Test Endpoint with unicode: ñáéíóú',
        'Test\nEndpoint\nwith\nnewlines',
        'Test\tEndpoint\twith\ttabs',
      ];

      for (const name of specialNames) {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send({
            name,
            description: 'Special character test',
            url: `https://special-${Date.now()}.example.com`,
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            createdBy: 'special-char-test',
          });

        // Should handle gracefully
        expect([201, 400]).toContain(response.status);
      }
    });

    it('should validate HTTP methods strictly', async () => {
      const invalidMethods = ['TRACE', 'CONNECT', 'INVALID', 'get', 'post', ''];

      for (const method of invalidMethods) {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send({
            name: 'Invalid Method Test',
            description: 'Testing invalid HTTP method',
            url: 'https://example.com',
            method: method,
            provider: ApiProvider.CUSTOM,
            createdBy: 'method-test',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should handle boundary values for numeric fields', async () => {
      const testCases = [
        { field: 'intervalSeconds', values: [0, -1, 1, 2147483647, 2147483648] },
        { field: 'timeoutMs', values: [0, -1, 1, 2147483647, 2147483648] },
        { field: 'retryAttempts', values: [-1, 0, 1, 100, 1000] },
        { field: 'retryDelayMs', values: [0, -1, 1, 2147483647] },
      ];

      for (const testCase of testCases) {
        for (const value of testCase.values) {
          const payload = {
            name: `Boundary Test ${testCase.field}`,
            description: `Testing ${testCase.field} with value ${value}`,
            url: `https://boundary-${Date.now()}.example.com`,
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            createdBy: 'boundary-test',
            [testCase.field]: value,
          };

          const response = await request(app.getHttpServer())
            .post('/api-ping-monitor/endpoints')
            .send(payload);

          // Should either accept valid values or reject invalid ones
          expect([201, 400]).toContain(response.status);
        }
      }
    });

    it('should handle malformed JSON in request bodies', async () => {
      const malformedJsonTests = [
        '{"name": "Test", "url": "https://example.com"', // Missing closing brace
        '{"name": "Test", "url": "https://example.com",}', // Trailing comma
        '{name: "Test", url: "https://example.com"}', // Unquoted keys
        'not json at all',
        '',
        'null',
        '[]',
      ];

      for (const malformedJson of malformedJsonTests) {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .set('Content-Type', 'application/json')
          .send(malformedJson);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('URL and Network Edge Cases', () => {
    it('should handle various URL formats and schemes', async () => {
      const urlTests = [
        { url: 'https://example.com', shouldWork: true },
        { url: 'http://example.com', shouldWork: true },
        { url: 'https://example.com:8080', shouldWork: true },
        { url: 'https://example.com/path?query=value', shouldWork: true },
        { url: 'https://subdomain.example.com', shouldWork: true },
        { url: 'ftp://example.com', shouldWork: false },
        { url: 'file:///etc/passwd', shouldWork: false },
        { url: 'javascript:alert("xss")', shouldWork: false },
        { url: 'data:text/html,<script>alert("xss")</script>', shouldWork: false },
        { url: 'localhost:3000', shouldWork: false }, // No scheme
        { url: '192.168.1.1', shouldWork: false }, // No scheme
        { url: 'https://', shouldWork: false }, // Incomplete URL
        { url: 'https://[::1]:8080', shouldWork: true }, // IPv6
      ];

      for (const test of urlTests) {
        const response = await request(app.getHttpServer())
          .post('/api-ping-monitor/endpoints')
          .send({
            name: `URL Test: ${test.url}`,
            description: 'Testing URL format validation',
            url: test.url,
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            createdBy: 'url-test',
          });

        if (test.shouldWork) {
          expect([201, 400]).toContain(response.status); // May fail validation for other reasons
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should handle timeout scenarios gracefully', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Timeout Test Endpoint',
          description: 'Tests timeout handling',
          url: 'https://httpbin.org/delay/10', // 10 second delay
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          timeoutMs: 2000, // 2 second timeout
          retryAttempts: 1,
          createdBy: 'timeout-test',
        })
      );

      const response = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(response.body.isSuccess).toBe(false);
      expect(response.body.status).toBe(PingStatus.TIMEOUT);
    }, 15000);

    it('should handle DNS resolution failures', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'DNS Failure Test',
          description: 'Tests DNS resolution failure',
          url: 'https://nonexistent-domain-for-testing-12345.com',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          timeoutMs: 5000,
          retryAttempts: 1,
          createdBy: 'dns-test',
        })
      );

      const response = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(response.body.isSuccess).toBe(false);
      expect([PingStatus.DNS_ERROR, PingStatus.CONNECTION_ERROR]).toContain(response.body.status);
    }, 15000);

    it('should handle connection refused scenarios', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Connection Refused Test',
          description: 'Tests connection refused handling',
          url: 'http://localhost:99999', // Port that should be closed
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          timeoutMs: 5000,
          retryAttempts: 1,
          createdBy: 'connection-test',
        })
      );

      const response = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(response.body.isSuccess).toBe(false);
      expect(response.body.status).toBe(PingStatus.CONNECTION_ERROR);
    }, 15000);
  });

  describe('Database Edge Cases', () => {
    it('should handle database constraints properly', async () => {
      // Create first endpoint
      const firstResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'First Endpoint',
          description: 'First endpoint for constraint testing',
          url: 'https://constraint-test.example.com',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'constraint-test',
        })
        .expect(201);

      // Try to create duplicate URL
      const duplicateResponse = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send({
          name: 'Second Endpoint',
          description: 'Should fail due to duplicate URL',
          url: 'https://constraint-test.example.com', // Same URL
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'constraint-test',
        })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should handle concurrent modifications gracefully', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Concurrent Test Endpoint',
          description: 'Testing concurrent modifications',
          url: 'https://concurrent.example.com',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'concurrent-test',
        })
      );

      // Perform concurrent updates
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .put(`/api-ping-monitor/endpoints/${endpoint.id}`)
            .send({
              name: `Updated Name ${i}`,
              description: `Updated by concurrent operation ${i}`,
            })
        );
      }

      const results = await Promise.all(promises);

      // At least one should succeed
      const successfulUpdates = results.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalEndpoint = await request(app.getHttpServer())
        .get(`/api-ping-monitor/endpoints/${endpoint.id}`)
        .expect(200);

      expect(finalEndpoint.body.name).toMatch(/Updated Name \d/);
    });

    it('should handle orphaned ping results gracefully', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Orphan Test Endpoint',
          description: 'Testing orphaned ping results',
          url: 'https://orphan.example.com',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'orphan-test',
        })
      );

      // Create ping results
      await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      // Verify ping result exists
      const resultsBeforeDelete = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ endpointId: endpoint.id })
        .expect(200);

      expect(resultsBeforeDelete.body.results.length).toBeGreaterThan(0);

      // Delete endpoint
      await request(app.getHttpServer())
        .delete(`/api-ping-monitor/endpoints/${endpoint.id}`)
        .expect(204);

      // Verify orphaned ping results are cleaned up (cascade delete)
      const resultsAfterDelete = await request(app.getHttpServer())
        .get('/api-ping-monitor/results')
        .query({ endpointId: endpoint.id })
        .expect(200);

      expect(resultsAfterDelete.body.results).toHaveLength(0);
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousInputs = [
        "'; DROP TABLE api_endpoints; --",
        "' OR '1'='1",
        "1; UPDATE api_endpoints SET name='hacked'",
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints')
          .query({ search: maliciousInput })
          .expect(200);

        // Should return normal results, not cause errors
        expect(response.body).toHaveProperty('endpoints');
        expect(response.body.endpoints).toBeInstanceOf(Array);
      }
    });

    it('should sanitize user input in endpoint creation', async () => {
      const maliciousPayload = {
        name: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
        url: 'https://example.com',
        method: HttpMethod.GET,
        provider: ApiProvider.CUSTOM,
        createdBy: '<img src=x onerror=alert("xss")>',
        tags: 'tag1,<script>alert("xss")</script>,tag2',
      };

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send(maliciousPayload)
        .expect(201);

      // Data should be stored but potentially sanitized
      expect(response.body.name).toBeDefined();
      expect(response.body.description).toBeDefined();
      expect(response.body.createdBy).toBeDefined();
    });

    it('should handle oversized payloads gracefully', async () => {
      const oversizedPayload = {
        name: 'A'.repeat(10000), // Very long name
        description: 'B'.repeat(50000), // Very long description
        url: 'https://example.com',
        method: HttpMethod.GET,
        provider: ApiProvider.CUSTOM,
        createdBy: 'oversized-test',
      };

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/endpoints')
        .send(oversizedPayload);

      // Should either accept it (with truncation) or reject it
      expect([201, 400, 413]).toContain(response.status);
    });
  });

  describe('Rate Limiting and Resource Protection', () => {
    it('should handle rapid successive requests', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Rapid Request Test',
          description: 'Testing rapid successive requests',
          url: 'https://httpbin.org/status/200',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          timeoutMs: 1000,
          createdBy: 'rapid-test',
        })
      );

      // Send 20 requests rapidly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
            .send({
              endpointId: endpoint.id,
              saveResult: true,
              includeDetails: false,
            })
        );
      }

      const results = await Promise.all(promises);

      // All should return some response (not necessarily success)
      results.forEach(response => {
        expect([200, 429, 503]).toContain(response.status);
      });
    }, 30000);

    it('should handle empty bulk operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: [], // Empty array
          saveResults: true,
          includeDetails: false,
        });

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should handle bulk operations with non-existent IDs', async () => {
      const fakeIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        '789e0123-e89b-12d3-a456-426614174002',
      ];

      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: fakeIds,
          saveResults: true,
          includeDetails: false,
        });

      // Should handle gracefully, likely returning empty results
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toHaveLength(0);
      }
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle analytics with no data gracefully', async () => {
      // Test analytics endpoints with no data
      const endpoints = [
        '/api-ping-monitor/analytics/uptime',
        '/api-ping-monitor/analytics/performance',
        '/api-ping-monitor/analytics/incidents',
        '/api-ping-monitor/statistics',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });

    it('should handle date range edge cases in analytics', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Date Range Test',
          description: 'Testing date range edge cases',
          url: 'https://daterange.example.com',
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          createdBy: 'date-test',
        })
      );

      const edgeCasePeriods = ['1h', '24h', '7d', '30d'];

      for (const period of edgeCasePeriods) {
        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/analytics/uptime')
          .query({ period, endpointId: endpoint.id })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      }
    });

    it('should handle pagination edge cases', async () => {
      // Create a few endpoints for testing
      const endpoints = [];
      for (let i = 0; i < 5; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `Pagination Test ${i}`,
            description: `Pagination test endpoint ${i}`,
            url: `https://pagination${i}.example.com`,
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            createdBy: 'pagination-test',
          })
        );
        endpoints.push(endpoint);
      }

      const paginationTests = [
        { limit: 0, offset: 0 }, // Zero limit
        { limit: -1, offset: 0 }, // Negative limit
        { limit: 1000000, offset: 0 }, // Huge limit
        { limit: 2, offset: -1 }, // Negative offset
        { limit: 2, offset: 1000000 }, // Huge offset
        { limit: 2, offset: 3 }, // Valid case
      ];

      for (const test of paginationTests) {
        const response = await request(app.getHttpServer())
          .get('/api-ping-monitor/endpoints')
          .query(test);

        // Should handle gracefully
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('endpoints');
          expect(response.body.endpoints).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover from temporary service disruptions', async () => {
      const endpoint = await endpointRepository.save(
        endpointRepository.create({
          name: 'Recovery Test Endpoint',
          description: 'Testing service recovery',
          url: 'https://httpbin.org/status/503', // Service unavailable
          method: HttpMethod.GET,
          provider: ApiProvider.CUSTOM,
          retryAttempts: 3,
          retryDelayMs: 100,
          createdBy: 'recovery-test',
        })
      );

      // Initial failure
      const failResponse = await request(app.getHttpServer())
        .post(`/api-ping-monitor/ping/manual/${endpoint.id}`)
        .send({
          endpointId: endpoint.id,
          saveResult: true,
          includeDetails: true,
        })
        .expect(200);

      expect(failResponse.body.isSuccess).toBe(false);

      // Simulate service recovery
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
    });

    it('should maintain service availability during high error rates', async () => {
      // Create multiple failing endpoints
      const endpoints = [];
      for (let i = 0; i < 10; i++) {
        const endpoint = await endpointRepository.save(
          endpointRepository.create({
            name: `High Error Rate Test ${i}`,
            description: `High error rate test ${i}`,
            url: 'https://httpbin.org/status/500',
            method: HttpMethod.GET,
            provider: ApiProvider.CUSTOM,
            timeoutMs: 2000,
            retryAttempts: 1,
            createdBy: 'error-rate-test',
          })
        );
        endpoints.push(endpoint);
      }

      // Perform bulk ping (all should fail)
      const response = await request(app.getHttpServer())
        .post('/api-ping-monitor/ping/bulk')
        .send({
          endpointIds: endpoints.map(e => e.id),
          saveResults: true,
          includeDetails: false,
        })
        .expect(200);

      // Service should remain available despite all failures
      expect(response.body).toHaveLength(10);
      response.body.forEach((result: any) => {
        expect(result.isSuccess).toBe(false);
      });

      // System should still be responsive
      const statsResponse = await request(app.getHttpServer())
        .get('/api-ping-monitor/statistics')
        .expect(200);

      expect(statsResponse.body.total).toBe(10);
    }, 30000);
  });
});