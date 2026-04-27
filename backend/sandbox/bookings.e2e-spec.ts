import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Booking flow (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let bookingId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).post('/auth/register')
      .send({ email: 'e2e@test.com', password: 'Test1234!', firstName: 'E2E', lastName: 'User' });

    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'e2e@test.com', password: 'Test1234!' });
    token = res.body.accessToken;

    const ws = await request(app.getHttpServer()).post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Room', capacity: 4 });
    workspaceId = ws.body.id;
  });

  afterAll(() => app.close());

  it('creates a booking', async () => {
    const res = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, date: '2026-06-01', startTime: '09:00', endTime: '11:00' })
      .expect(201);
    bookingId = res.body.id;
  });

  it('rejects double-booking the same workspace on the same date', () =>
    request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, date: '2026-06-01', startTime: '09:00', endTime: '11:00' })
      .expect(409));

  it('returns 401 without JWT', () =>
    request(app.getHttpServer()).post('/bookings')
      .send({ workspaceId, date: '2026-06-02' })
      .expect(401));

  it('confirms, checks in, and checks out', async () => {
    await request(app.getHttpServer()).patch(`/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app.getHttpServer()).post(`/bookings/${bookingId}/checkin`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app.getHttpServer()).post(`/bookings/${bookingId}/checkout`).set('Authorization', `Bearer ${token}`).expect(200);
  });
});
