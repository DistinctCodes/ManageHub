export interface UtilizationReport {
  totalBookedHours: number;
  availableHours: number;
  utilizationPercent: number;
  peakDate: string;
  quietDate: string;
}

export function calculateUtilization(input: {
  capacitySeats: number;
  openHoursPerDay: number;
  bookings: Array<{ startDate: Date; endDate: Date }>;
  periodDays: number;
}): UtilizationReport {
  const { capacitySeats, openHoursPerDay, bookings, periodDays } = input;
  const availableHours = periodDays * openHoursPerDay * capacitySeats;

  const hoursPerDay: Record<string, number> = {};
  for (const booking of bookings) {
    const durationHours =
      (booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60);
    const dateKey = booking.startDate.toISOString().slice(0, 10);
    hoursPerDay[dateKey] = (hoursPerDay[dateKey] ?? 0) + durationHours;
  }

  const totalBookedHours = Object.values(hoursPerDay).reduce((s, h) => s + h, 0);
  const utilizationPercent =
    availableHours === 0
      ? 0
      : Math.min(100, Math.round((totalBookedHours / availableHours) * 100));

  let peakDate = '';
  let quietDate = '';
  let peakHours = -Infinity;
  let quietHours = Infinity;

  for (const [date, hours] of Object.entries(hoursPerDay)) {
    if (hours > peakHours) {
      peakHours = hours;
      peakDate = date;
    }
    if (hours < quietHours) {
      quietHours = hours;
      quietDate = date;
    }
  }

  return { totalBookedHours, availableHours, utilizationPercent, peakDate, quietDate };
}
