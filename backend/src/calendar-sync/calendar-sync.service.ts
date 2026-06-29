import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { CalendarToken } from './entities/calendar-token.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    @InjectRepository(CalendarToken) private tokenRepo: Repository<CalendarToken>,
    private config: ConfigService,
  ) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI'),
    );
  }

  getAuthUrl(): string {
    const client = this.getOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const client = this.getOAuth2Client();
    const { tokens } = await client.getToken(code);
    await this.tokenRepo.upsert(
      {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? '',
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        calendarId: 'primary',
      },
      ['userId'],
    );
  }

  async disconnect(userId: string): Promise<void> {
    await this.tokenRepo.delete({ userId });
  }

  async getStatus(userId: string) {
    const token = await this.tokenRepo.findOne({ where: { userId } });
    return { connected: !!token, provider: token?.provider ?? null };
  }

  async createEvent(userId: string, booking: Booking): Promise<void> {
    const token = await this.tokenRepo.findOne({ where: { userId } });
    if (!token) return;
    try {
      const client = this.getOAuth2Client();
      client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: client });
      const event = await calendar.events.insert({
        calendarId: token.calendarId ?? 'primary',
        requestBody: {
          summary: `Booking: ${(booking as any).workspace?.name ?? 'Workspace'}`,
          start: { date: booking.startDate },
          end: { date: booking.endDate },
          description: `ManageHub booking #${booking.id}`,
        },
      });
      // Store event ID on booking for later deletion
      (booking as any).googleCalendarEventId = event.data.id;
    } catch (err) {
      this.logger.warn(`Calendar event creation failed for user ${userId}: ${err}`);
    }
  }

  async deleteEvent(userId: string, booking: Booking): Promise<void> {
    const token = await this.tokenRepo.findOne({ where: { userId } });
    const eventId = (booking as any).googleCalendarEventId;
    if (!token || !eventId) return;
    try {
      const client = this.getOAuth2Client();
      client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: client });
      await calendar.events.delete({ calendarId: token.calendarId ?? 'primary', eventId });
    } catch (err) {
      this.logger.warn(`Calendar event deletion failed for user ${userId}: ${err}`);
    }
  }
}
