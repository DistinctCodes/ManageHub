jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  })),
}));

import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { SorobanRailStatus } from './payments/soroban/soroban-rail-status';

describe('AppService.getHealth', () => {
  it('reports a Soroban version-check failure as a degraded dependency', async () => {
    const status = new SorobanRailStatus();
    status.markUnavailable('payment_escrow interface version mismatch');
    const service = new AppService(
      { query: jest.fn().mockResolvedValue([]) } as unknown as DataSource,
      {
        get: jest.fn((_key: string, fallback: unknown) => fallback),
      } as unknown as ConfigService,
      status,
    );

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: {
        postgres: { status: 'up' },
        redis: { status: 'up' },
        soroban: {
          status: 'down',
          detail: 'payment_escrow interface version mismatch',
        },
      },
    });
  });
});
