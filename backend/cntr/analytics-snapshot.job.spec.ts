import { buildDailySnapshot, PlatformStats } from './analytics-snapshot.job';

const sampleStats: PlatformStats = {
  totalMembers: 150,
  activeBookings: 23,
  totalRevenueKobo: 5_000_000,
  newRegistrations: 8,
  checkInsToday: 12,
};

describe('buildDailySnapshot', () => {
  it('formats snapshotDate as YYYY-MM-DD', () => {
    const snapshot = buildDailySnapshot(sampleStats, new Date('2026-03-15T10:00:00Z'));
    expect(snapshot.snapshotDate).toBe('2026-03-15');
  });

  it('formats single-digit month and day with padding', () => {
    const snapshot = buildDailySnapshot(sampleStats, new Date('2026-01-05T00:00:00Z'));
    expect(snapshot.snapshotDate).toBe('2026-01-05');
  });

  it('includes all PlatformStats fields in output', () => {
    const snapshot = buildDailySnapshot(sampleStats, new Date('2026-06-01T00:00:00Z'));
    expect(snapshot.totalMembers).toBe(sampleStats.totalMembers);
    expect(snapshot.activeBookings).toBe(sampleStats.activeBookings);
    expect(snapshot.totalRevenueKobo).toBe(sampleStats.totalRevenueKobo);
    expect(snapshot.newRegistrations).toBe(sampleStats.newRegistrations);
    expect(snapshot.checkInsToday).toBe(sampleStats.checkInsToday);
  });

  it('id is a valid UUID', () => {
    const snapshot = buildDailySnapshot(sampleStats, new Date());
    expect(snapshot.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('output is a plain object', () => {
    const snapshot = buildDailySnapshot(sampleStats, new Date());
    expect(typeof snapshot).toBe('object');
    expect(snapshot.constructor).toBe(Object);
  });

  it('generates unique ids for each call', () => {
    const a = buildDailySnapshot(sampleStats, new Date());
    const b = buildDailySnapshot(sampleStats, new Date());
    expect(a.id).not.toBe(b.id);
  });
});
