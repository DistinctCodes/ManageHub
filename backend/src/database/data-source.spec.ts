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
});
