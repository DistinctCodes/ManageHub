import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

describe('AppDataSource pool configuration (issue #1778)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function loadDataSource() {
    let mod: typeof import('./data-source');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('./data-source');
    });
    return mod!;
  }

  it('defaults DB_POOL_MIN/MAX to node-postgres defaults when unset', () => {
    delete process.env.DB_POOL_MIN;
    delete process.env.DB_POOL_MAX;

    const { DB_POOL_MIN, DB_POOL_MAX, AppDataSource } = loadDataSource();

    expect(DB_POOL_MIN).toBe(2);
    expect(DB_POOL_MAX).toBe(10);
    expect(AppDataSource.options.extra).toEqual({ min: 2, max: 10 });
  });

  it('reads DB_POOL_MIN/MAX from the environment when set', () => {
    process.env.DB_POOL_MIN = '5';
    process.env.DB_POOL_MAX = '25';

    const { DB_POOL_MIN, DB_POOL_MAX, AppDataSource } = loadDataSource();

    expect(DB_POOL_MIN).toBe(5);
    expect(DB_POOL_MAX).toBe(25);
    expect(AppDataSource.options.extra).toEqual({ min: 5, max: 25 });
  });

  it('disables TLS by default outside production (issue #1956)', () => {
    delete process.env.DATABASE_SSL;
    delete process.env.DATABASE_SSL_CA;

    const { AppDataSource } = loadDataSource();

    expect((AppDataSource.options as PostgresConnectionOptions).ssl).toBe(
      false,
    );
  });

  it('enables TLS from DATABASE_SSL and DATABASE_SSL_CA (issue #1956)', () => {
    const ca = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';
    process.env.DATABASE_SSL = 'verify-full';
    process.env.DATABASE_SSL_CA = ca;

    const { AppDataSource } = loadDataSource();

    expect((AppDataSource.options as PostgresConnectionOptions).ssl).toEqual({
      rejectUnauthorized: true,
      ca,
    });
  });

  it('fails fast on a misconfigured CA (issue #1956)', () => {
    process.env.DATABASE_SSL = 'require';
    process.env.DATABASE_SSL_CA = '/etc/ssl/ca.pem';

    expect(() => loadDataSource()).toThrow(/DATABASE_SSL_CA/);
  });
});
