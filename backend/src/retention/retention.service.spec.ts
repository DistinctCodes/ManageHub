import { createTransport } from 'nodemailer';
import { RetentionService } from './retention.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

interface Row {
  id: string;
  at: Date;
}

/**
 * Minimal in-memory stand-in for a TypeORM repository that supports the
 * exact query-builder surface the retention job uses (bounded id page +
 * count + delete-by-ids), so the batching and dry-run behaviour can be
 * asserted against real row state rather than call scripts.
 */
function makeRepository(rows: Row[]) {
  function makeBuilder() {
    const state: { cutoff?: Date; limit: number } = { limit: Infinity };
    const builder = {
      select: jest.fn(() => builder),
      where: jest.fn((_sql: string, params: { cutoff: Date }) => {
        state.cutoff = params.cutoff;
        return builder;
      }),
      orderBy: jest.fn(() => builder),
      limit: jest.fn((n: number) => {
        state.limit = n;
        return builder;
      }),
      getRawMany: jest.fn(async () =>
        rows
          .filter((row) => row.at.getTime() < (state.cutoff?.getTime() ?? 0))
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .slice(0, state.limit)
          .map((row) => ({ id: row.id })),
      ),
      getCount: jest.fn(
        async () =>
          rows.filter(
            (row) => row.at.getTime() < (state.cutoff?.getTime() ?? 0),
          ).length,
      ),
    };
    return builder;
  }

  const repository = {
    createQueryBuilder: jest.fn(() => makeBuilder()),
    delete: jest.fn(async (ids: string[]) => {
      const target = new Set(ids);
      let affected = 0;
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (target.has(rows[index].id)) {
          rows.splice(index, 1);
          affected += 1;
        }
      }
      return { affected };
    }),
  };
  return repository;
}

function monthsAgo(
  months: number,
  from = new Date('2026-08-27T00:00:00.000Z'),
) {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

describe('RetentionService', () => {
  const now = new Date('2026-08-27T12:00:00.000Z');

  function setup(
    configValues: Record<string, unknown> = {},
    rows: { access: Row[]; usage: Row[] } = { access: [], usage: [] },
  ) {
    const config = { DATA_RETENTION_ENABLED: 'true', ...configValues };
    const configService = {
      get: (key: string, def?: unknown) => config[key] ?? def,
    };
    const accessLogRepository = makeRepository(rows.access);
    const usageRepository = makeRepository(rows.usage);
    const metrics = {
      recordRetentionRun: jest.fn(),
      recordRetentionFailure: jest.fn(),
    };
    const service = new RetentionService(
      accessLogRepository as any,
      usageRepository as any,
      configService as any,
      metrics as any,
    );
    return {
      service,
      accessLogRepository,
      usageRepository,
      metrics,
      rows,
    };
  }

  beforeEach(() => {
    (createTransport as jest.Mock).mockReset();
  });

  it('prunes both tables older than the configured window in bounded batches', async () => {
    const rows = {
      access: [
        { id: 'a-old-1', at: monthsAgo(7, now) },
        { id: 'a-old-2', at: monthsAgo(8, now) },
        { id: 'a-old-3', at: monthsAgo(9, now) },
        { id: 'a-new', at: monthsAgo(1, now) },
      ],
      usage: [
        { id: 'u-old-1', at: monthsAgo(7, now) },
        { id: 'u-old-2', at: monthsAgo(8, now) },
        { id: 'u-new', at: monthsAgo(1, now) },
      ],
    };
    const { service, accessLogRepository, usageRepository } = setup(
      { DATA_RETENTION_MONTHS: '6', DATA_RETENTION_BATCH_SIZE: '2' },
      rows,
    );

    const summary = await service.purgeExpiredData(now);

    expect(summary).toMatchObject({
      walletKeyAccessLogDeleted: 3,
      meteredUsageEventsDeleted: 2,
      dryRun: false,
    });
    expect(summary.cutoff).toEqual(monthsAgo(6, now));
    // Every DELETE statement is bounded by the batch size, so no single
    // statement could lock for a long time.
    for (const call of accessLogRepository.delete.mock.calls) {
      expect(call[0].length).toBeLessThanOrEqual(2);
    }
    for (const call of usageRepository.delete.mock.calls) {
      expect(call[0].length).toBeLessThanOrEqual(2);
    }
    // Old rows are gone, new rows survive.
    expect(rows.access.map((row) => row.id)).toEqual(['a-new']);
    expect(rows.usage.map((row) => row.id)).toEqual(['u-new']);
  });

  it('honours a custom retention window', async () => {
    const rows = {
      access: [{ id: 'a', at: monthsAgo(11, now) }],
      usage: [] as Row[],
    };
    const { service } = setup({ DATA_RETENTION_MONTHS: '12' }, rows);

    const summary = await service.purgeExpiredData(now);

    expect(summary.walletKeyAccessLogDeleted).toBe(0);
    expect(summary.cutoff).toEqual(monthsAgo(12, now));
    expect(rows.access).toHaveLength(1);
  });

  it('defaults the window to 6 months when unset', async () => {
    const { service } = setup();
    const summary = await service.purgeExpiredData(now);
    expect(summary.cutoff).toEqual(monthsAgo(6, now));
  });

  it('reports zero deletions when nothing is affected', async () => {
    const { service } = setup();
    const summary = await service.purgeExpiredData(now);
    expect(summary.walletKeyAccessLogDeleted).toBe(0);
    expect(summary.meteredUsageEventsDeleted).toBe(0);
  });

  it('dry run changes no rows and reports the count that would be deleted', async () => {
    const rows = {
      access: [
        { id: 'a-old-1', at: monthsAgo(7, now) },
        { id: 'a-old-2', at: monthsAgo(8, now) },
        { id: 'a-new', at: monthsAgo(1, now) },
      ],
      usage: [{ id: 'u-old-1', at: monthsAgo(7, now) }],
    };
    const { service, accessLogRepository, usageRepository } = setup(
      { DATA_RETENTION_MONTHS: '6' },
      rows,
    );

    const summary = await service.purgeExpiredData(now, { dryRun: true });

    expect(accessLogRepository.delete).not.toHaveBeenCalled();
    expect(usageRepository.delete).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      dryRun: true,
      walletKeyAccessLogDeleted: 2,
      meteredUsageEventsDeleted: 1,
    });
    expect(summary.walletKeyAccessLogSampleIds).toEqual(['a-old-1', 'a-old-2']);
    // Nothing was actually removed.
    expect(rows.access).toHaveLength(3);
    expect(rows.usage).toHaveLength(1);
  });

  it('a forced failure produces a metric increment and an alert', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const { service, metrics } = setup({
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'alerts@example.test',
      SMTP_PASS: 'secret',
      SMTP_FROM_EMAIL: 'alerts@example.test',
      SUPPORT_EMAIL: 'support@example.test',
    });
    jest
      .spyOn(service, 'purgeExpiredData')
      .mockRejectedValueOnce(new Error('database is unavailable'));

    await expect(service.handleCron()).resolves.toBeUndefined();

    expect(metrics.recordRetentionFailure).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: 'support@example.test',
    });
    expect(String(sendMail.mock.calls[0][0].text)).toContain(
      'database is unavailable',
    );
  });

  it('records a successful run and does not alert when the pass succeeds', async () => {
    const sendMail = jest.fn();
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const { service, metrics } = setup({
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'alerts@example.test',
      SMTP_PASS: 'secret',
      SMTP_FROM_EMAIL: 'alerts@example.test',
      SUPPORT_EMAIL: 'support@example.test',
    });

    await expect(service.handleCron()).resolves.toBeUndefined();

    expect(metrics.recordRetentionRun).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false }),
    );
    expect(metrics.recordRetentionFailure).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('honours DATA_RETENTION_DRY_RUN from configuration', async () => {
    const { service } = setup({ DATA_RETENTION_DRY_RUN: 'true' });
    const spy = jest.spyOn(service, 'purgeExpiredData');

    await service.handleCron();

    expect(spy).toHaveBeenCalledWith(expect.any(Date), { dryRun: true });
  });

  it('does nothing when the job is disabled', async () => {
    const { service } = setup({ DATA_RETENTION_ENABLED: 'false' });
    const spy = jest.spyOn(service, 'purgeExpiredData');

    await service.handleCron();

    expect(spy).not.toHaveBeenCalled();
  });
});
