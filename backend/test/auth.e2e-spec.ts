import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { UserRole } from '../src/auth/enums/user-role.enum';
import { createTestApp } from './create-test-app';

/**
 * End-to-end coverage of the real HTTP stack (issue #1953): the global
 * validation pipe (with forbidNonWhitelisted), the auth guards, bearer vs.
 * cookie extraction, and the role guard on admin routes.
 */
describe('Auth & admin authorization (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let users: Repository<User>;

  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-9';
  let memberToken: string;
  let memberCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    users = app.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    if (users) {
      await users.delete({ email });
    }
    if (app) {
      await app.close();
    }
  });

  it('rejects a password longer than bcrypt can hash (400)', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email: `too-long-${email}`, password: 'a'.repeat(73) });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/at most 72/i);
  });

  it('rejects a trivially common password (400)', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email: `common-${email}`, password: 'password123' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/common passwords/i);
  });

  it('rejects unknown fields (forbidNonWhitelisted)', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email: `extra-${email}`, password, isAdmin: true });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/isAdmin/i);
  });

  it('registers a user, issues a JWT and sets the httpOnly cookie', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email, password });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, role: UserRole.USER });

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie?.some((c) => c.startsWith('accessToken='))).toBe(true);
    expect(JSON.stringify(setCookie)).toMatch(/HttpOnly/i);

    memberToken = res.body.accessToken;
    memberCookie = setCookie.find((c) => c.startsWith('accessToken='));
  });

  it('rejects a duplicate registration (409)', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email, password });

    expect(res.status).toBe(409);
  });

  it('rejects a wrong password at login (401)', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({ email, password: 'not-the-password' });

    expect(res.status).toBe(401);
  });

  it('logs in and returns a fresh token', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({ email, password });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    memberToken = res.body.accessToken;
  });

  describe('authenticated call to GET /credits/balance', () => {
    it('accepts a bearer token', async () => {
      const res = await request(server)
        .get('/credits/balance')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ balance: 0 });
    });

    it('accepts the httpOnly cookie', async () => {
      const res = await request(server)
        .get('/credits/balance')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ balance: 0 });
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(server).get('/credits/balance');
      expect(res.status).toBe(401);
    });
  });

  describe('admin route GET /admin/audit/actions', () => {
    it('rejects a missing token (401)', async () => {
      const res = await request(server).get('/admin/audit/actions');
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin member (403)', async () => {
      const res = await request(server)
        .get('/admin/audit/actions')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('allows an admin token', async () => {
      await users.update({ email }, { role: UserRole.ADMIN });
      const login = await request(server)
        .post('/auth/login')
        .send({ email, password });
      expect(login.status).toBe(201);

      const res = await request(server)
        .get('/admin/audit/actions')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
