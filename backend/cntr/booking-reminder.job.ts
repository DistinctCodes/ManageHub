export interface Booking {
  id: string;
  userId: string;
  workspaceName: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export async function processBookingReminders(
  bookings: Booking[],
  notifyFn: (userId: string, message: string) => Promise<void>,
  now: Date = new Date(),
): Promise<void> {
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = bookings.filter(
    (b) => b.status !== 'CANCELLED' && b.startDate > now && b.startDate <= cutoff,
  );
  for (const booking of upcoming) {
    const message = `Reminder: Your booking at "${booking.workspaceName}" starts at ${booking.startDate.toISOString()}.`;
    await notifyFn(booking.userId, message);
  }
}
