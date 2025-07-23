import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BadgesModule } from './badges.module';

describe('BadgesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BadgesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/badges (GET) should return all badges', () => {
    return request(app.getHttpServer())
      .get('/badges')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((b: any) => b.id === 'attendance-30')).toBe(true);
      });
  });

  it('/badges/user/user1 (GET) should return 30-day attendance badge', () => {
    return request(app.getHttpServer())
      .get('/badges/user/user1')
      .expect(200)
      .expect(res => {
        expect(res.body.some((b: any) => b.id === 'attendance-30')).toBe(true);
      });
  });

  it('/badges/user/user2 (GET) should not return 30-day attendance badge', () => {
    return request(app.getHttpServer())
      .get('/badges/user/user2')
      .expect(200)
      .expect(res => {
        expect(res.body.some((b: any) => b.id === 'attendance-30')).toBe(false);
      });
  });

  it('/badges/user/unknown (GET) should return empty array', () => {
    return request(app.getHttpServer())
      .get('/badges/user/unknown')
      .expect(200)
      .expect(res => {
        expect(res.body.length).toBe(0);
      });
  });
}); 