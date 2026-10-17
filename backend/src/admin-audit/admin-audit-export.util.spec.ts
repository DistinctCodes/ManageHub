import {
  ADMIN_AUDIT_CSV_COLUMNS,
  AdminAuditEntry,
  escapeCsvValue,
  exportAdminAuditToCsv,
} from './admin-audit-export.util';

function makeEntry(overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry {
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
  };
}

describe('escapeCsvValue', () => {
  it('neutralises formula-prefixed values', () => {
    expect(escapeCsvValue('=1+1')).toBe("'=1+1");
    expect(escapeCsvValue('+1')).toBe("'+1");
    expect(escapeCsvValue('-1')).toBe("'-1");
    expect(escapeCsvValue('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('quotes values containing separators or quotes', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line\nbreak')).toBe('"line\nbreak"');
  });

  it('neutralises then quotes a formula that also contains a comma', () => {
    expect(escapeCsvValue('=cmd,quoted')).toBe('"\'=cmd,quoted"');
  });

  it('renders null and undefined as empty cells', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('leaves ordinary values untouched', () => {
    expect(escapeCsvValue('payment_void')).toBe('payment_void');
  });
});

describe('exportAdminAuditToCsv', () => {
  it('writes a stable header followed by one row per entry', () => {
    const csv = exportAdminAuditToCsv([makeEntry()]);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(ADMIN_AUDIT_CSV_COLUMNS.join(','));
    expect(lines[1]).toBe(
      'log-1,actor-1,payment_void,Payment,payment-1,reason,203.0.113.7,jest-agent,2025-01-01T00:00:00.000Z',
    );
  });

  it('neutralises a formula-prefixed detail in a full row', () => {
    const csv = exportAdminAuditToCsv([
      makeEntry({ detail: '=HYPERLINK("evil")' }),
    ]);

    expect(csv.split('\n')[1]).toContain('"\'=HYPERLINK(""evil"")"');
  });

  it('returns just the header for an empty result set', () => {
    expect(exportAdminAuditToCsv([])).toBe(ADMIN_AUDIT_CSV_COLUMNS.join(','));
  });
});
