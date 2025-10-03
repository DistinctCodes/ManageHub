import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('AppController (e2e)', () => {
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

  it('POST /auth/forgot-password with unknown email returns 404', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .set('Content-Type', 'application/json')
      .send({ email: 'unknown+e2e@example.com' })
      .expect(404);
  });
});
