import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { Request, Response, json, urlencoded } from 'express';
import { AppModule } from '../src/app.module';
import { TestSupportModule } from './test-support.module';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Boots the real AppModule with the same HTTP wiring main.ts uses — explicit
 * body parsers that capture the exact raw bytes (the webhook HMAC path), the
 * httpOnly auth cookie parser, and the global validation pipe with
 * forbidNonWhitelisted (issue #1953). main.ts's AllExceptionsFilter is
 * intentionally not registered so assertions can see Nest's default
 * validation error payloads (the list of constraint messages); the filter's
 * own behavior is covered by its unit spec.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, TestSupportModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
    bodyParser: false,
    rawBody: true,
  });

  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? '1mb';
  const captureRawBody = (req: Request, _res: Response, buf: Buffer): void => {
    (req as RawBodyRequest).rawBody = Buffer.from(buf);
  };

  app.use(json({ limit: requestBodyLimit, verify: captureRawBody }));
  app.use(
    urlencoded({
      extended: true,
      limit: requestBodyLimit,
      verify: captureRawBody,
    }),
  );
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return app;
}
