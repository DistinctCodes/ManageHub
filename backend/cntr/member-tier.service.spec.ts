import { classifyMemberTier } from './member-tier.service';

describe('classifyMemberTier', () => {
  it('returns BRONZE for 0 bookings and 0 spend', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 0 })).toBe('BRONZE');
  });

  it('returns BRONZE for 9 bookings and 499999 kobo', () => {
    expect(classifyMemberTier({ totalBookings: 9, totalSpendKobo: 499_999 })).toBe('BRONZE');
  });

  it('returns SILVER for exactly 10 bookings', () => {
    expect(classifyMemberTier({ totalBookings: 10, totalSpendKobo: 0 })).toBe('SILVER');
  });

  it('returns SILVER for exactly 500000 kobo spend', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 500_000 })).toBe('SILVER');
  });

  it('returns SILVER for 29 bookings (below gold threshold)', () => {
    expect(classifyMemberTier({ totalBookings: 29, totalSpendKobo: 0 })).toBe('SILVER');
  });

  it('returns SILVER for 1999999 kobo (below gold threshold)', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 1_999_999 })).toBe('SILVER');
  });

  it('returns GOLD for exactly 30 bookings', () => {
    expect(classifyMemberTier({ totalBookings: 30, totalSpendKobo: 0 })).toBe('GOLD');
  });

  it('returns GOLD for exactly 2000000 kobo spend', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 2_000_000 })).toBe('GOLD');
  });

  it('returns GOLD for 99 bookings (below platinum threshold)', () => {
    expect(classifyMemberTier({ totalBookings: 99, totalSpendKobo: 0 })).toBe('GOLD');
  });

  it('returns GOLD for 9999999 kobo (below platinum threshold)', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 9_999_999 })).toBe('GOLD');
  });

  it('returns PLATINUM for exactly 100 bookings', () => {
    expect(classifyMemberTier({ totalBookings: 100, totalSpendKobo: 0 })).toBe('PLATINUM');
  });

  it('returns PLATINUM for exactly 10000000 kobo spend', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 10_000_000 })).toBe('PLATINUM');
  });

  it('returns PLATINUM for bookings-only path above threshold', () => {
    expect(classifyMemberTier({ totalBookings: 200, totalSpendKobo: 0 })).toBe('PLATINUM');
  });

  it('returns PLATINUM for spend-only path above threshold', () => {
    expect(classifyMemberTier({ totalBookings: 0, totalSpendKobo: 50_000_000 })).toBe('PLATINUM');
  });
});
