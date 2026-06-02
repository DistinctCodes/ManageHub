import { createAuditEntry } from './audit-trail.service';

const actor = { userId: 'user-1', role: 'ADMIN' };

describe('createAuditEntry', () => {
  it('id is a valid UUID', () => {
    const entry = createAuditEntry(actor, 'DELETE', 'workspace', 'ws-42');
    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates unique ids for each call', () => {
    const a = createAuditEntry(actor, 'CREATE', 'workspace', 'ws-1');
    const b = createAuditEntry(actor, 'CREATE', 'workspace', 'ws-1');
    expect(a.id).not.toBe(b.id);
  });

  it('timestamp is a valid ISO 8601 string', () => {
    const entry = createAuditEntry(actor, 'UPDATE', 'member', 'm-1');
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('maps actor.userId to actorId', () => {
    const entry = createAuditEntry({ userId: 'u-99', role: 'ADMIN' }, 'READ', 'report', 'r-1');
    expect(entry.actorId).toBe('u-99');
  });

  it('maps actor.role to actorRole', () => {
    const entry = createAuditEntry({ userId: 'u-1', role: 'SUPERADMIN' }, 'DELETE', 'ws', 'ws-1');
    expect(entry.actorRole).toBe('SUPERADMIN');
  });

  it('metadata defaults to {} when not provided', () => {
    const entry = createAuditEntry(actor, 'DELETE', 'workspace', 'ws-1');
    expect(entry.metadata).toEqual({});
  });

  it('metadata is deep-cloned to prevent mutation', () => {
    const originalMeta = { reason: 'test', nested: { count: 1 } };
    const entry = createAuditEntry(actor, 'UPDATE', 'member', 'm-1', originalMeta);
    originalMeta.nested.count = 999;
    expect((entry.metadata as any).nested.count).toBe(1);
  });

  it('includes all required fields', () => {
    const entry = createAuditEntry(actor, 'DELETE', 'booking', 'bk-1', { note: 'test' });
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('actorId');
    expect(entry).toHaveProperty('actorRole');
    expect(entry).toHaveProperty('action');
    expect(entry).toHaveProperty('resourceType');
    expect(entry).toHaveProperty('resourceId');
    expect(entry).toHaveProperty('metadata');
    expect(entry).toHaveProperty('timestamp');
  });
});
