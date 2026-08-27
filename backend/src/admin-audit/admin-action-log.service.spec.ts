import { AdminActionLogService } from './admin-action-log.service';
import { AdminActionType } from './admin-action-type.enum';

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
