import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';

import { UsersModule } from '../src/users/users.module';
import { User } from '../src/users/entities/user.entity';
import { AuthModule } from '../src/auth/auth.module';

describe('UsersModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [User],
          synchronize: true,
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users creates user and hides passwordHash', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({
        fullName: 'Alice Doe',
        email: 'alice@example.com',
        password: 'secret123',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('GET /users returns list', async () => {
    const res = await request(app.getHttpServer()).get('/users').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /users/:id updates fullName', async () => {
    const list = await request(app.getHttpServer()).get('/users').expect(200);
    const id = list.body[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/users/${id}`)
      .send({ fullName: 'Alice Updated' })
      .expect(200);

    expect(res.body.fullName).toBe('Alice Updated');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('DELETE /users/:id removes and returns 204', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({
        fullName: 'Bob Doe',
        email: 'bob@example.com',
        password: 'secret123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .expect(204);
  });
});