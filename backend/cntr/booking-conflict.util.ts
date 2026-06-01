/**
 * Represents an object with start and end dates.
 */
interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Represents a booking with date range information.
 */
export interface BookingWithDates extends DateRange {
  id?: string;
  [key: string]: any;
}

/**
 * Checks if two time ranges overlap.
 * Adjacent bookings (where end of A === start of B) are NOT considered overlapping.
 *
 * @param a - First date range
 * @param b - Second date range
 * @returns true if ranges overlap, false if they are adjacent or don't overlap
 */
export function hasTimeOverlap(a: DateRange, b: DateRange): boolean {
  const aStart = new Date(a.startDate);
  const aEnd = new Date(a.endDate);
  const bStart = new Date(b.startDate);
  const bEnd = new Date(b.endDate);

  // Two ranges overlap if: aStart < bEnd && aEnd > bStart
  // This correctly handles adjacent bookings as non-overlapping
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Finds all existing bookings that conflict with a new booking.
 *
 * @param newBooking - The new booking to check against
 * @param existingBookings - Array of existing bookings to check for conflicts
 * @returns Array of bookings that conflict with the new booking
 */
export function findConflictingBookings<T extends BookingWithDates>(
  newBooking: T,
  existingBookings: T[],
): T[] {
  return existingBookings.filter((booking) =>
    hasTimeOverlap(newBooking, booking),
  );
}
