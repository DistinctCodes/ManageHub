import { createUsageLog, ResourceType } from './resource-usage.service';

describe('createUsageLog', () => {
  it('throws RangeError for quantity = 0', () => {
    expect(() => createUsageLog('s1', 'm1', 'PRINT', 0, 'pages')).toThrow(RangeError);
  });

  it('throws RangeError for negative quantity', () => {
    expect(() => createUsageLog('s1', 'm1', 'PRINT', -1, 'pages')).toThrow(RangeError);
  });

  it('does not throw for quantity > 0', () => {
    expect(() => createUsageLog('s1', 'm1', 'PRINT', 1, 'pages')).not.toThrow();
  });

  it('recordedAt is a valid ISO 8601 string', () => {
    const log = createUsageLog('s1', 'm1', 'INTERNET', 5, 'MB');
    expect(() => new Date(log.recordedAt)).not.toThrow();
    expect(log.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('returns all expected fields', () => {
    const log = createUsageLog('session-42', 'member-7', 'LOCKER', 1, 'unit');
    expect(log.sessionId).toBe('session-42');
    expect(log.memberId).toBe('member-7');
    expect(log.resourceType).toBe('LOCKER');
    expect(log.quantity).toBe(1);
    expect(log.unit).toBe('unit');
  });

  it('works for PRINT resource type', () => {
    const log = createUsageLog('s', 'm', 'PRINT', 10, 'pages');
    expect(log.resourceType).toBe('PRINT');
  });

  it('works for INTERNET resource type', () => {
    const log = createUsageLog('s', 'm', 'INTERNET', 100, 'MB');
    expect(log.resourceType).toBe('INTERNET');
  });

  it('works for LOCKER resource type', () => {
    const log = createUsageLog('s', 'm', 'LOCKER', 1, 'unit');
    expect(log.resourceType).toBe('LOCKER');
  });
});
