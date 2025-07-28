import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { ApiKeyModule } from '../api-key.module';
import { ApiKey, ApiKeyStatus } from '../api-key.entity';
import { ApiKeyUsage } from '../api-key-usage.entity';

describe('ApiKeyModule (Integration)', () => {
  let app: INestApplication;
  let apiKeyRepository: Repository<ApiKey>;
  let usageRepository: Repository<ApiKeyUsage>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ApiKey, ApiKeyUsage],
          synchronize: true,
        }),
        ApiKeyModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    apiKeyRepository = moduleFixture.get('ApiKeyRepository');
    usageRepository = moduleFixture.get('ApiKeyUsageRepository');
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await usageRepository.delete({});
    await apiKeyRepository.delete({});
  });

  describe('POST /api-keys', () => {
    it('should create a new API key', async () => {
      const createDto = {
        appName: 'test-app',
        contactEmail: 'test@example.com',
        description: 'Test application',
        dailyLimit: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/api-keys')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('apiKey');
      expect(response.body.appName).toBe(createDto.appName);
      expect(response.body.contactEmail).toBe(createDto.contactEmail);
      expect(response.body.status).toBe(ApiKeyStatus.ACTIVE);
    });

    it('should return 409 if app name already exists', async () => {
      const createDto = {
        appName: 'duplicate-app',
        contactEmail: 'test@example.com',
      };

      // Create first API key
      await request(app.getHttpServer())
        .post('/api-keys')
        .send(createDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/api-keys')
        .send(createDto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        appName: '',
        contactEmail: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/api-keys')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api-keys', () => {
    it('should return all API keys', async () => {
      // Create test data
      const apiKey = apiKeyRepository.create({
        appName: 'test-app',
        keyHash: 'hashed-key',
        contactEmail: 'test@example.com',
        status: ApiKeyStatus.ACTIVE,
        dailyLimit: 1000,
        currentDayUsage: 0,
        totalUsage: 0,
      });
      await apiKeyRepository.save(apiKey);

      const response = await request(app.getHttpServer())
        .get('/api-keys')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].appName).toBe('test-app');
      expect(response.body[0]).not.toHaveProperty('keyHash');
    });
  });

  describe('PUT /api-keys/:id', () => {
    it('should update an API key', async () => {
      // Create test API key
      const apiKey = apiKeyRepository.create({
        appName: 'test-app',
        keyHash: 'hashed-key',
        contactEmail: 'test@example.com',
        status: ApiKeyStatus.ACTIVE,
        dailyLimit: 1000,
        currentDayUsage: 0,
        totalUsage: 0,
      });
      const savedKey = await apiKeyRepository.save(apiKey);

      const updateDto = {
        description: 'Updated description',
        dailyLimit: 2000,
      };

      const response = await request(app.getHttpServer())
        .put(`/api-keys/${savedKey.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.description).toBe(updateDto.description);
      expect(response.body.dailyLimit).toBe(updateDto.dailyLimit);
    });
  });

  describe('DELETE /api-keys/:id/revoke', () => {
    it('should revoke an API key', async () => {
      // Create test API key
      const apiKey = apiKeyRepository.create({
        appName: 'test-app',
        keyHash: 'hashed-key',
        contactEmail: 'test@example.com',
        status: ApiKeyStatus.ACTIVE,
        dailyLimit: 1000,
        currentDayUsage: 0,
        totalUsage: 0,
      });
      const savedKey = await apiKeyRepository.save(apiKey);

      await request(app.getHttpServer())
        .delete(`/api-keys/${savedKey.id}/revoke`)
        .expect(200);

      const revokedKey = await apiKeyRepository.findOne({ where: { id: savedKey.id } });
      expect(revokedKey.status).toBe(ApiKeyStatus.REVOKED);
    });
  });
});