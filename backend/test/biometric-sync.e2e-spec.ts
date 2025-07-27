import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BiometricSyncController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /biometric-sync/sync should return success or failure', async () => {
    const response = await request(app.getHttpServer())
      .post('/biometric-sync/sync')
      .expect(201);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('timestamp');
    if (!response.body.success) {
      expect(response.body).toHaveProperty('error');
    }
  });
}); 