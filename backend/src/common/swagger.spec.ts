import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { isSwaggerEnabled, setupSwagger, SWAGGER_PATH } from './swagger';

describe('isSwaggerEnabled', () => {
  it('is enabled outside production by default', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isSwaggerEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isSwaggerEnabled({})).toBe(true);
  });

  it('is disabled in production by default', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('can be force-enabled in production with SWAGGER_ENABLED=true', () => {
    expect(
      isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('treats a non-"true" SWAGGER_ENABLED value as not enabled', () => {
    expect(
      isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: '1' }),
    ).toBe(false);
    expect(
      isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'false' }),
    ).toBe(false);
  });
});

describe('setupSwagger', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  /**
   * Mirrors main.ts: the swagger routes are registered on the app before
   * Nest initialises the HTTP layer, so they are matched ahead of Nest's
   * catch-all 404 handler.
   */
  const bootstrapWithSwagger = async (env: {
    NODE_ENV?: string;
    SWAGGER_ENABLED?: string;
    SWAGGER_USER?: string;
    SWAGGER_PASSWORD?: string;
  }): Promise<boolean> => {
    const moduleRef = await Test.createTestingModule({}).compile();
    const application = moduleRef.createNestApplication();
    app = application;
    const enabled = setupSwagger(application, env);
    await application.init();
    return enabled;
  };

  it('returns 404 for the docs route in production by default', async () => {
    expect(await bootstrapWithSwagger({ NODE_ENV: 'production' })).toBe(false);

    await request(app!.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(404);
  });

  it('serves the docs route outside production', async () => {
    expect(await bootstrapWithSwagger({ NODE_ENV: 'development' })).toBe(true);

    await request(app!.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(200);
  });

  it('serves the docs route in production when SWAGGER_ENABLED=true', async () => {
    expect(
      await bootstrapWithSwagger({
        NODE_ENV: 'production',
        SWAGGER_ENABLED: 'true',
      }),
    ).toBe(true);

    await request(app!.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(200);
  });

  it('requires basic auth when SWAGGER_USER and SWAGGER_PASSWORD are set', async () => {
    await bootstrapWithSwagger({
      NODE_ENV: 'development',
      SWAGGER_USER: 'docs',
      SWAGGER_PASSWORD: 'secret',
    });

    await request(app!.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(401);
    await request(app!.getHttpServer())
      .get(`/${SWAGGER_PATH}`)
      .auth('docs', 'secret')
      .expect(200);
  });
});
