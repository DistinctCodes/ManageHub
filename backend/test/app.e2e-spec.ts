import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus  } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

import { UserRole } from '../src/users/enums/userRoles.enum';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let adminToken: string;
  let testAdmin: User;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

});
