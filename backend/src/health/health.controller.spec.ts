import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let typeOrmHealthIndicator: { pingCheck: jest.Mock };
  const originalHealthCheckTimeout = process.env.HEALTH_CHECK_TIMEOUT_MS;

  beforeEach(async () => {
    const check = jest.fn(async (indicators: Array<() => any>) => {
      const results = await Promise.all(
        indicators.map((indicator) => indicator()),
      );
      const details = Object.assign({}, ...results);
      return { status: 'ok', info: details, error: {}, details };
    });
    const pingCheck = jest
      .fn()
      .mockResolvedValue({ database: { status: 'up' } });

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: { check },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: { pingCheck },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
    healthCheckService = { check };
    typeOrmHealthIndicator = { pingCheck };
    jest.spyOn(process, 'uptime').mockReturnValue(42.25);
  });

  afterEach(() => {
    if (originalHealthCheckTimeout === undefined) {
      delete process.env.HEALTH_CHECK_TIMEOUT_MS;
    } else {
      process.env.HEALTH_CHECK_TIMEOUT_MS = originalHealthCheckTimeout;
    }
    jest.restoreAllMocks();
  });

  it('returns a dependency-free liveness envelope with process metadata', async () => {
    const result = await controller.liveness();

    expect(result).toMatchObject({
      status: 'ok',
      service: 'managehub-backend',
      uptimeSeconds: 42.25,
    });
    expect(result.info).toMatchObject({ service: { status: 'up' } });
    expect(typeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled();
  });

  it('pings TypeORM with the configured bounded readiness timeout', async () => {
    process.env.HEALTH_CHECK_TIMEOUT_MS = '1250';

    await controller.readiness();

    expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database', {
      timeout: 1250,
    });
    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
  });

  it('uses the default timeout when the readiness timeout is invalid', async () => {
    process.env.HEALTH_CHECK_TIMEOUT_MS = 'not-a-number';

    await controller.readiness();

    expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database', {
      timeout: 3000,
    });
  });
});
