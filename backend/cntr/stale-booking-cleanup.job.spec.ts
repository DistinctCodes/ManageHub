import { identifyStaleBookings, Booking } from './stale-booking-cleanup.job';

const now = new Date('2026-06-02T12:00:00Z');

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bk-1',
  status: 'PENDING',
  createdAt: new Date('2026-06-01T10:00:00Z'),
  ...overrides,
});

describe('identifyStaleBookings', () => {
  it('returns PENDING bookings older than maxAgeHours', () => {
    const old = booking({ createdAt: new Date('2026-06-01T10:00:00Z') }); // 26h ago
    expect(identifyStaleBookings([old], 24, now)).toContain(old);
  });

  it('does not return PENDING bookings younger than maxAgeHours', () => {
    const fresh = booking({ createdAt: new Date('2026-06-02T10:00:00Z') }); // 2h ago
    expect(identifyStaleBookings([fresh], 24, now)).not.toContain(fresh);
  });

  it('does not return booking exactly at maxAgeHours (strict greater)', () => {
    const exactly = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const b = booking({ createdAt: exactly });
    expect(identifyStaleBookings([b], 24, now)).not.toContain(b);
  });

  it('returns booking 1ms over maxAgeHours', () => {
    const justOver = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1);
    const b = booking({ createdAt: justOver });
    expect(identifyStaleBookings([b], 24, now)).toContain(b);
  });

  it('ignores non-PENDING statuses', () => {
    for (const status of ['CONFIRMED', 'CANCELLED', 'COMPLETED']) {
      const b = booking({ status, createdAt: new Date('2026-06-01T00:00:00Z') });
      expect(identifyStaleBookings([b], 24, now)).not.toContain(b);
    }
  });

  it('respects custom maxAgeHours', () => {
    const b = booking({ createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) });
    expect(identifyStaleBookings([b], 2, now)).toContain(b);
    expect(identifyStaleBookings([b], 4, now)).not.toContain(b);
  });

  it('accepts optional now parameter for testability', () => {
    const customNow = new Date('2030-01-01T00:00:00Z');
    const b = booking({ createdAt: new Date('2026-06-01T00:00:00Z') });
    expect(identifyStaleBookings([b], 24, customNow)).toContain(b);
  });
});
