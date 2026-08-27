import { LessThan } from 'typeorm';
import { RetentionService } from './retention.service';

describe('RetentionService', () => {
  const monthsAgo = (
    months: number,
    from = new Date('2026-08-27T00:00:00.000Z'),
  ) => {
    const d = new Date(from);
    d.setUTCMonth(d.getUTCMonth() - months);
    return d;
  };

  function setup(months?: string) {
    const config: Record<string, string> = { DATA_RETENTION_ENABLED: 'true' };
    if (months !== undefined) {
      config.DATA_RETENTION_MONTHS = months;
    }
    const configService = {
      get: (key: string, def?: unknown) => config[key] ?? def,
    };
    const accessLogRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 4 }),
    };
    const usageRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 7 }),
    };
    const service = new RetentionService(
      accessLogRepository as any,
      usageRepository as any,
      configService as any,
    );
    return { service, accessLogRepository, usageRepository };
  }

  it('prunes both tables older than the configured window', async () => {
    const { service, accessLogRepository, usageRepository } = setup('6');
    const now = new Date('2026-08-27T12:00:00.000Z');

    const summary = await service.purgeExpiredData(now);

    expect(accessLogRepository.delete).toHaveBeenCalledWith({
      occurredAt: LessThan(monthsAgo(6, now)),
    });
    expect(usageRepository.delete).toHaveBeenCalledWith({
      createdAt: LessThan(monthsAgo(6, now)),
    });
    expect(summary).toEqual({
      walletKeyAccessLogDeleted: 4,
      meteredUsageEventsDeleted: 7,
      cutoff: monthsAgo(6, now),
    });
  });

  it('honours a custom retention window', async () => {
    const { service } = setup('12');
    const now = new Date('2026-08-27T12:00:00.000Z');
    const summary = await service.purgeExpiredData(now);
    expect(summary.cutoff).toEqual(monthsAgo(12, now));
  });

  it('defaults the window to 6 months when unset', async () => {
    const { service, accessLogRepository } = setup(undefined);
    const now = new Date('2026-08-27T12:00:00.000Z');
    await service.purgeExpiredData(now);
    expect(accessLogRepository.delete).toHaveBeenCalledWith({
      occurredAt: LessThan(monthsAgo(6, now)),
    });
  });

  it('reports zero deletions when nothing is affected', async () => {
    const { service, accessLogRepository, usageRepository } = setup('6');
    accessLogRepository.delete.mockResolvedValue({ affected: 0 });
    usageRepository.delete.mockResolvedValue({ affected: undefined });
    const summary = await service.purgeExpiredData();
    expect(summary.walletKeyAccessLogDeleted).toBe(0);
    expect(summary.meteredUsageEventsDeleted).toBe(0);
  });
});
