export interface Booking {
  id: string;
  status: string;
  createdAt: Date;
}

export function identifyStaleBookings(
  bookings: Booking[],
  maxAgeHours = 24,
  now: Date = new Date(),
): Booking[] {
  return bookings.filter((b) => {
    if (b.status !== 'PENDING') return false;
    const ageHours = (now.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60);
    return ageHours > maxAgeHours;
  });
}
