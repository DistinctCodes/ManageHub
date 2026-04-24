import { StreakService } from './streak.service';

describe('StreakService.calculateStreak', () => {
  let service: StreakService;

  beforeEach(() => {
    // Instantiate without DB dependency — only testing pure calculation
    service = new StreakService(null as any);
  });

  const day = (offsetDays: number): Date => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offsetDays);
    return d;
  };

  it('returns 0 streak for empty logs', () => {
    expect(service.calculateStreak([])).toEqual({
      streak: 0,
      lastCheckinDate: null,
    });
  });

  it('returns streak of 1 for a single check-in today', () => {
    const { streak } = service.calculateStreak([day(0)]);
    expect(streak).toBe(1);
  });

  it('returns streak of 1 for a single check-in yesterday', () => {
    const { streak } = service.calculateStreak([day(1)]);
    expect(streak).toBe(1);
  });

  it('returns 0 when last check-in was 2+ days ago', () => {
    const { streak } = service.calculateStreak([day(2), day(3)]);
    expect(streak).toBe(0);
  });

  it('counts consecutive days correctly', () => {
    const { streak } = service.calculateStreak([
      day(0),
      day(1),
      day(2),
      day(3),
    ]);
    expect(streak).toBe(4);
  });

  it('stops streak at a gap', () => {
    // today, yesterday, then a gap (skip day(2)), day(3)
    const { streak } = service.calculateStreak([day(0), day(1), day(3)]);
    expect(streak).toBe(2);
  });

  it('deduplicates multiple check-ins on the same day', () => {
    const today = day(0);
    const { streak } = service.calculateStreak([today, today, day(1)]);
    expect(streak).toBe(2);
  });
});
