import { Booking } from '../entities/booking.entity';

export function generateICS(bookings: Booking[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ManageHub//ResourceBooking//EN',
  ];
  for (const b of bookings) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${b.id}`);
    lines.push(`SUMMARY:Resource Booking - ${b.resource?.name || b.resourceId}`);
    lines.push(`DTSTART:${formatICSDate(b.startTime)}`);
    lines.push(`DTEND:${formatICSDate(b.endTime)}`);
    lines.push(`DESCRIPTION:Booked by ${b.bookedBy}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICSDate(date: Date): string {
  // Format as YYYYMMDDTHHmmssZ
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
