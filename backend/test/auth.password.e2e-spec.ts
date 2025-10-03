import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/providers/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';

class EmailServiceMock {
  public lastResetToken: string | null = null;
  public lastResetLink: string | null = null;
  async sendEmail() { return true; }
  async verifyConnection() { return true; }
  async sendRegistrationConfirmation() { return true; }
  async sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string, token: string) {
    this.lastResetToken = token;
    this.lastResetLink = resetLink;
    return true;
  }
}

function uniqueEmail(prefix = 'e2e'): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `${prefix}+${ts}.${rand}@example.com`;
}

describe('Auth password flows (e2e with real DB)', () => {
  let app: INestApplication;
  let server: any;
  let usersRepo: Repository<User>;
  const emailMock = new EmailServiceMock();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('forgot-password -> reset-password -> login succeeds', async () => {
    const email = uniqueEmail('forgot-flow');

    // Register a user
    await request(server)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({
        firstname: 'Jane',
        lastname: 'Doe',
        email,
        password: 'StrongPass1!',
      })
      .expect(201);

    // Forgot password
    await request(server)
      .post('/auth/forgot-password')
      .set('Content-Type', 'application/json')
      .send({ email })
      .expect(200);

    expect(emailMock.lastResetToken).toBeTruthy();

    // Reset password
    await request(server)
      .post('/auth/reset-password')
      .set('Content-Type', 'application/json')
      .send({ token: emailMock.lastResetToken, newPassword: 'NewStrongPass2!' })
      .expect(200);

    // Login with new password
    await request(server)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: 'NewStrongPass2!' })
      .expect(200);
  }, 60000);

  it('reset-password with invalid token fails with 401', async () => {
    await request(server)
      .post('/auth/reset-password')
      .set('Content-Type', 'application/json')
      .send({ token: 'invalid-token', newPassword: 'Whatever123!' })
      .expect(401);
  }, 30000);

  it('reset-password with expired token fails', async () => {
    const email = uniqueEmail('expired-flow');

    // Register user
    await request(server)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({
        firstname: 'John',
        lastname: 'Smith',
        email,
        password: 'StrongPass1!',
      })
      .expect(201);

    // Forgot password to generate token
    await request(server)
      .post('/auth/forgot-password')
      .set('Content-Type', 'application/json')
      .send({ email })
      .expect(200);

    expect(emailMock.lastResetToken).toBeTruthy();

    // Expire the token by setting the DB expiry to past
    const user = await usersRepo.findOne({ where: { email } });
    expect(user).toBeTruthy();
    user.passwordResetExpiresIn = new Date(Date.now() - 10_000);
    await usersRepo.save(user);

    // Attempt reset with expired token
    await request(server)
      .post('/auth/reset-password')
      .set('Content-Type', 'application/json')
      .send({ token: emailMock.lastResetToken, newPassword: 'AnotherPass3!' })
      .expect(400);
  }, 60000);
});