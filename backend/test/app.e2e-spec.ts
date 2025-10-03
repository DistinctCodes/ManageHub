import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus  } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);
import { UserRole } from '../src/users/enums/userRoles.enum';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let adminToken: string;
  let testAdmin: User;

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
