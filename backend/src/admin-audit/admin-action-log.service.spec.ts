import { AdminActionLogService } from './admin-action-log.service';
import { AdminActionType } from './admin-action-type.enum';
import { runWithRequestContext } from '../common/request-context';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

function makeLogRepository(seed: any[] = []) {
  const rows = [...seed];
  return {
    create: jest.fn((entity) => ({ id: 'generated', ...entity })),
    save: jest.fn(async (entity) => {
      const row = { ...entity, createdAt: new Date('2025-01-01T00:00:00Z') };
      rows.push(row);
      return row;
    }),
    find: jest.fn(async (options?: any) => {
      let result = rows.map((r) => ({ ...r }));
      if (options?.where?.action) {
        result = result.filter((r) => r.action === options.where.action);
      }
      return result;
    }),
    count: jest.fn(async () => rows.length),
    _rows: rows,
  };
}

describe('AdminActionLogService', () => {
  it('records each admin action with actor, target and detail', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);

    const log = await service.record({
      actorId: 'actor-1',
      action: AdminActionType.SETTLEMENT_BATCH_EXECUTE,
      targetType: 'SettlementBatch',
      targetId: 'batch-1',
      detail: 'DISTRIBUTION',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo._rows).toHaveLength(1);
    expect(log.actorId).toBe('actor-1');
    expect(log.action).toBe('settlement_batch_execute');
    expect(log.targetId).toBe('batch-1');
    expect(log.detail).toBe('DISTRIBUTION');
  });

  it('captures IP and User-Agent from the active request context', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);

    const log = await runWithRequestContext(
      { requestId: 'req-1', ip: '203.0.113.7', userAgent: 'jest-agent' },
      () =>
        service.record({
          actorId: 'actor-1',
          action: AdminActionType.PAYMENT_VOID,
          targetType: 'Payment',
        }),
    );

    expect(log.ip).toBe('203.0.113.7');
    expect(log.userAgent).toBe('jest-agent');
  });

  it('stores explicit metadata over the request context', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);

    const log = await runWithRequestContext(
      { requestId: 'req-1', ip: '203.0.113.7', userAgent: 'context-agent' },
      () =>
        service.record({
          actorId: 'actor-1',
          action: AdminActionType.PAYMENT_VOID,
          targetType: 'Payment',
          ip: '198.51.100.4',
          userAgent: 'explicit-agent',
        }),
    );

    expect(log.ip).toBe('198.51.100.4');
    expect(log.userAgent).toBe('explicit-agent');
  });

  it('records null metadata outside a request context', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);

    const log = await service.record({
      actorId: 'actor-1',
      action: AdminActionType.PAYMENT_VOID,
      targetType: 'Payment',
    });

    expect(log.ip).toBeNull();
    expect(log.userAgent).toBeNull();
  });

  it('caps and range-filters the export query', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);
    const from = new Date('2025-01-01T00:00:00Z');
    const to = new Date('2025-02-01T00:00:00Z');

    await service.listForExport({
      from,
      to,
      action: AdminActionType.PAYMENT_VOID,
      limit: 10000,
    });

    expect(repo.find).toHaveBeenCalledWith({
      where: { action: 'payment_void', createdAt: Between(from, to) },
      order: { createdAt: 'DESC' },
      take: 10000,
    });
  });

  it('supports an open-ended export range', async () => {
    const repo = makeLogRepository();
    const service = new AdminActionLogService(repo as any);
    const from = new Date('2025-01-01T00:00:00Z');

    await service.listForExport({ from, limit: 50 });
    expect(repo.find).toHaveBeenLastCalledWith({
      where: { createdAt: MoreThanOrEqual(from) },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const to = new Date('2025-02-01T00:00:00Z');
    await service.listForExport({ to, limit: 50 });
    expect(repo.find).toHaveBeenLastCalledWith({
      where: { createdAt: LessThanOrEqual(to) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  });

  it('lists logs newest first', async () => {
    const repo = makeLogRepository([
      { id: 'a', action: 'payment_void', createdAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'b', action: 'payment_resolve_manually', createdAt: new Date('2025-01-01T00:00:00Z') },
    ]);
    const service = new AdminActionLogService(repo as any);

    const list = await service.list();
    expect(list).toHaveLength(2);
    expect(repo.find).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'DESC' },
    });
  });

  it('filters by action type', async () => {
    const repo = makeLogRepository([
      { id: 'a', action: 'payment_void' },
      { id: 'b', action: 'split_config_activate' },
    ]);
    const service = new AdminActionLogService(repo as any);

    await service.list(AdminActionType.PAYMENT_VOID);
    expect(repo.find).toHaveBeenCalledWith({
      where: { action: 'payment_void' },
      order: { createdAt: 'DESC' },
    });
  });

  it('counts recorded actions', async () => {
    const repo = makeLogRepository([{ id: 'a', action: 'payment_void' }]);
    const service = new AdminActionLogService(repo as any);
    await expect(service.count()).resolves.toBe(1);
  });
});
