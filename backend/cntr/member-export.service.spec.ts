import { exportMembersToCSV, MemberExportRow } from './member-export.service';

const member = (overrides: Partial<MemberExportRow> = {}): MemberExportRow => ({
  id: 'u-1',
  email: 'alice@example.com',
  fullName: 'Alice Smith',
  role: 'MEMBER',
  status: 'ACTIVE',
  joinedDate: '2026-01-15',
  totalBookings: 5,
  ...overrides,
});

describe('exportMembersToCSV', () => {
  it('returns a string', () => {
    const csv = exportMembersToCSV([member()]);
    expect(typeof csv).toBe('string');
  });

  it('first line is the header row', () => {
    const csv = exportMembersToCSV([member()]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('ID');
    expect(firstLine).toContain('Email');
    expect(firstLine).toContain('Full Name');
    expect(firstLine).toContain('Role');
    expect(firstLine).toContain('Status');
    expect(firstLine).toContain('Joined Date');
    expect(firstLine).toContain('Total Bookings');
  });

  it('includes member data in the output', () => {
    const csv = exportMembersToCSV([member({ email: 'bob@example.com', fullName: 'Bob Jones' })]);
    expect(csv).toContain('bob@example.com');
    expect(csv).toContain('Bob Jones');
  });

  it('returns only header for an empty array', () => {
    const csv = exportMembersToCSV([]);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it('includes data for multiple members', () => {
    const csv = exportMembersToCSV([
      member({ id: 'u-1', email: 'alice@example.com' }),
      member({ id: 'u-2', email: 'bob@example.com' }),
    ]);
    expect(csv).toContain('alice@example.com');
    expect(csv).toContain('bob@example.com');
  });

  it('includes joinedDate in YYYY-MM-DD format', () => {
    const csv = exportMembersToCSV([member({ joinedDate: '2026-03-20' })]);
    expect(csv).toContain('2026-03-20');
  });
});
