import { BadRequestException } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller';
import { AdminActionLogService } from './admin-action-log.service';
import { AdminActionType } from './admin-action-type.enum';

function makeLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    actorId: 'actor-1',
    action: 'payment_void',
    targetType: 'Payment',
    targetId: 'payment-1',
    detail: 'reason',
    ip: '203.0.113.7',
    userAgent: 'jest-agent',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  } as any;
}

async function readStream(file: { getStream: () => NodeJS.ReadableStream }) {
  const chunks: Buffer[] = [];
  for await (const chunk of file.getStream() as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

describe('AdminAuditController', () => {
  let audit: {
    list: jest.Mock;
    listForExport: jest.Mock;
    record: jest.Mock;
  };
  let controller: AdminAuditController;

  beforeEach(() => {
    audit = {
      list: jest.fn(),
      listForExport: jest.fn().mockResolvedValue([]),
      record: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AdminAuditController(audit as unknown as AdminActionLogService);
  });

  it('lists actions and includes ip/userAgent in the DTO', async () => {
    audit.list.mockResolvedValueOnce([makeLog()]);

    const result = await controller.list();

    expect(result).toHaveLength(1);
    expect(result[0].ip).toBe('203.0.113.7');
    expect(result[0].userAgent).toBe('jest-agent');
  });

  it('exports the filtered rows as CSV in a stable column order', async () => {
    audit.listForExport.mockResolvedValueOnce([makeLog()]);

    const file = await controller.export(undefined, undefined, undefined, {
      id: 'admin-1',
    } as any);
    const csv = await readStream(file);

    expect(audit.listForExport).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
      action: undefined,
      limit: expect.any(Number),
    });
    expect(csv.split('\n')[0]).toBe(
      'id,actorId,action,targetType,targetId,detail,ip,userAgent,createdAt',
    );
    expect(csv.split('\n')[1]).toContain('log-1,actor-1,payment_void');
    expect(file.getHeaders().type).toBe('text/csv');
  });

  it('records the export itself as an audit event', async () => {
    audit.listForExport.mockResolvedValueOnce([makeLog(), makeLog({ id: 'log-2' })]);

    await controller.export(undefined, undefined, undefined, {
      id: 'admin-1',
    } as any);

    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: AdminActionType.AUDIT_EXPORT,
      targetType: 'AdminActionLog',
      detail: 'exported=2',
    });
  });

  it('passes the date range and action filter through to the query', async () => {
    const from = '2025-01-01T00:00:00.000Z';
    const to = '2025-02-01T00:00:00.000Z';

    await controller.export(from, to, AdminActionType.PAYMENT_VOID, {
      id: 'admin-1',
    } as any);

    expect(audit.listForExport).toHaveBeenCalledWith({
      from: new Date(from),
      to: new Date(to),
      action: AdminActionType.PAYMENT_VOID,
      limit: expect.any(Number),
    });
  });

  it('rejects an unparseable date', async () => {
    await expect(
      controller.export('not-a-date', undefined, undefined, undefined),
    ).rejects.toThrow(BadRequestException);
    expect(audit.listForExport).not.toHaveBeenCalled();
  });

  it('rejects a reversed date range', async () => {
    await expect(
      controller.export(
        '2025-02-01T00:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        undefined,
        undefined,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(audit.listForExport).not.toHaveBeenCalled();
  });
});
