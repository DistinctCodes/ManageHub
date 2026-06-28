import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CalendarExportProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly configService: ConfigService,
  ) {}

  async exportSingleBooking(bookingId: string, userId: string): Promise<string> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['workspace'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only export your own bookings');
    }

    return this.buildCalendar([booking]);
  }

  async exportAllUpcoming(userId: string): Promise<string> {
    const now = new Date().toISOString().split('T')[0];
    const bookings = await this.bookingsRepository.find({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        startDate: MoreThanOrEqual(now),
      },
      relations: ['workspace'],
      order: { startDate: 'ASC' },
    });

    return this.buildCalendar(bookings);
  }

  private buildCalendar(bookings: Booking[]): string {
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//ManageHub//Bookings//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');

    const hubAddress =
      this.configService.get<string>('HUB_ADDRESS') || 'ManageHub Coworking Space';

    for (const booking of bookings) {
      const uid = booking.id;
      const dtStart = this.formatDate(booking.startDate);
      const dtEnd = this.formatDate(booking.endDate);
      const summary = booking.workspace?.name || 'Workspace Booking';
      const location = booking.workspace?.name
        ? `${booking.workspace.name}, ${hubAddress}`
        : hubAddress;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${this.escapeText(summary)}`);
      lines.push(`LOCATION:${this.escapeText(location)}`);
      lines.push(`DTSTAMP:${this.formatDate(new Date().toISOString().split('T')[0])}T000000Z`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatDate(dateStr: string): string {
    return dateStr.replace(/-/g, '');
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
