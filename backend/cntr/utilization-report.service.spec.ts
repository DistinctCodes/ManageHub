import { calculateUtilization } from './utilization-report.service';

describe('calculateUtilization', () => {
  const makeBooking = (startIso: string, hours: number) => {
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
    return { startDate, endDate };
  };

  it('computes availableHours = periodDays * openHoursPerDay * capacitySeats', () => {
    const result = calculateUtilization({
      capacitySeats: 10,
      openHoursPerDay: 8,
      bookings: [],
      periodDays: 5,
    });
    expect(result.availableHours).toBe(400);
  });

  it('computes totalBookedHours from bookings', () => {
    const result = calculateUtilization({
      capacitySeats: 5,
      openHoursPerDay: 8,
      bookings: [makeBooking('2026-01-01T09:00:00Z', 2), makeBooking('2026-01-02T09:00:00Z', 3)],
      periodDays: 7,
    });
    expect(result.totalBookedHours).toBe(5);
  });

  it('caps utilizationPercent at 100', () => {
    const result = calculateUtilization({
      capacitySeats: 1,
      openHoursPerDay: 1,
      bookings: [makeBooking('2026-01-01T09:00:00Z', 10)],
      periodDays: 1,
    });
    expect(result.utilizationPercent).toBe(100);
  });

  it('peakDate is the day with the most booked hours (YYYY-MM-DD format)', () => {
    const result = calculateUtilization({
      capacitySeats: 10,
      openHoursPerDay: 8,
      bookings: [
        makeBooking('2026-01-01T09:00:00Z', 1),
        makeBooking('2026-01-02T09:00:00Z', 6),
        makeBooking('2026-01-03T09:00:00Z', 2),
      ],
      periodDays: 7,
    });
    expect(result.peakDate).toBe('2026-01-02');
    expect(result.peakDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('quietDate is the day with the fewest booked hours (YYYY-MM-DD format)', () => {
    const result = calculateUtilization({
      capacitySeats: 10,
      openHoursPerDay: 8,
      bookings: [
        makeBooking('2026-01-01T09:00:00Z', 1),
        makeBooking('2026-01-02T09:00:00Z', 6),
        makeBooking('2026-01-03T09:00:00Z', 2),
      ],
      periodDays: 7,
    });
    expect(result.quietDate).toBe('2026-01-01');
    expect(result.quietDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 0 utilizationPercent when availableHours is 0', () => {
    const result = calculateUtilization({
      capacitySeats: 0,
      openHoursPerDay: 8,
      bookings: [],
      periodDays: 5,
    });
    expect(result.utilizationPercent).toBe(0);
  });
});
