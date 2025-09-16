import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Event, EventStatus } from '../entities/event.entity';
import { EventRsvp, RsvpStatus } from '../entities/event-rsvp.entity';
import { EmailNotificationService } from './email-notification.service';

export enum ReminderType {
  EARLY_REMINDER = 'early_reminder', // 7 days before
  REMINDER = 'reminder', // 1 day before
  FINAL_REMINDER = 'final_reminder', // 2 hours before
  POST_EVENT_THANK_YOU = 'post_event_thank_you', // 1 day after
  POST_EVENT_FEEDBACK = 'post_event_feedback', // 3 days after
  POST_EVENT_FOLLOW_UP = 'post_event_follow_up', // 1 week after
}

export interface ReminderSettings {
  enabled: boolean;
  timing: {
    earlyReminder: number; // days before event
    reminder: number; // days before event
    finalReminder: number; // hours before event
    thankYou: number; // days after event
    feedbackRequest: number; // days after event
    followUp: number; // days after event
  };
  customization: {
    includeEventDetails: boolean;
    includeLocationMap: boolean;
    includeWeatherInfo: boolean;
    includeAgenda: boolean;
    includeCancellationPolicy: boolean;
  };
  conditions: {
    minAttendeesForReminder: number;
    sendToWaitlist: boolean;
    sendToCheckedIn: boolean;
    sendToNoShows: boolean;
  };
}

export interface ReminderTemplate {
  type: ReminderType;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
}

export interface ReminderLog {
  id: string;
  eventId: string;
  rsvpId?: string;
  type: ReminderType;
  recipientEmail: string;
  sentAt: Date;
  successful: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);
  private readonly reminderLogs: Map<string, ReminderLog[]> = new Map();

  private readonly defaultSettings: ReminderSettings = {
    enabled: true,
    timing: {
      earlyReminder: 7,
      reminder: 1,
      finalReminder: 2,
      thankYou: 1,
      feedbackRequest: 3,
      followUp: 7,
    },
    customization: {
      includeEventDetails: true,
      includeLocationMap: true,
      includeWeatherInfo: false,
      includeAgenda: true,
      includeCancellationPolicy: true,
    },
    conditions: {
      minAttendeesForReminder: 1,
      sendToWaitlist: false,
      sendToCheckedIn: true,
      sendToNoShows: false,
    },
  };

  private readonly reminderTemplates: Map<ReminderType, ReminderTemplate> =
    new Map([
      [
        ReminderType.EARLY_REMINDER,
        {
          type: ReminderType.EARLY_REMINDER,
          subject: 'Upcoming Event: {{eventTitle}} - 1 Week Reminder',
          htmlTemplate: this.getEarlyReminderTemplate(),
          textTemplate: this.getEarlyReminderTextTemplate(),
          variables: [
            'eventTitle',
            'eventDate',
            'eventTime',
            'location',
            'organizer',
            'attendeeName',
          ],
        },
      ],
      [
        ReminderType.REMINDER,
        {
          type: ReminderType.REMINDER,
          subject: 'Tomorrow: {{eventTitle}} - Event Reminder',
          htmlTemplate: this.getReminderTemplate(),
          textTemplate: this.getReminderTextTemplate(),
          variables: [
            'eventTitle',
            'eventDate',
            'eventTime',
            'location',
            'organizer',
            'attendeeName',
            'agenda',
          ],
        },
      ],
      [
        ReminderType.FINAL_REMINDER,
        {
          type: ReminderType.FINAL_REMINDER,
          subject: 'Starting Soon: {{eventTitle}} - Final Reminder',
          htmlTemplate: this.getFinalReminderTemplate(),
          textTemplate: this.getFinalReminderTextTemplate(),
          variables: [
            'eventTitle',
            'eventDate',
            'eventTime',
            'location',
            'organizer',
            'attendeeName',
          ],
        },
      ],
      [
        ReminderType.POST_EVENT_THANK_YOU,
        {
          type: ReminderType.POST_EVENT_THANK_YOU,
          subject: 'Thank You for Attending: {{eventTitle}}',
          htmlTemplate: this.getThankYouTemplate(),
          textTemplate: this.getThankYouTextTemplate(),
          variables: ['eventTitle', 'eventDate', 'organizer', 'attendeeName'],
        },
      ],
      [
        ReminderType.POST_EVENT_FEEDBACK,
        {
          type: ReminderType.POST_EVENT_FEEDBACK,
          subject: 'Your Feedback Matters: {{eventTitle}}',
          htmlTemplate: this.getFeedbackRequestTemplate(),
          textTemplate: this.getFeedbackRequestTextTemplate(),
          variables: [
            'eventTitle',
            'eventDate',
            'organizer',
            'attendeeName',
            'feedbackUrl',
          ],
        },
      ],
      [
        ReminderType.POST_EVENT_FOLLOW_UP,
        {
          type: ReminderType.POST_EVENT_FOLLOW_UP,
          subject: 'Follow-up: {{eventTitle}} Resources & Next Steps',
          htmlTemplate: this.getFollowUpTemplate(),
          textTemplate: this.getFollowUpTextTemplate(),
          variables: [
            'eventTitle',
            'eventDate',
            'organizer',
            'attendeeName',
            'resources',
          ],
        },
      ],
    ]);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private rsvpRepository: Repository<EventRsvp>,
    private emailNotificationService: EmailNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processReminders(): Promise<void> {
    this.logger.log('Processing scheduled reminders...');

    try {
      await Promise.all([
        this.processEarlyReminders(),
        this.processRegularReminders(),
        this.processFinalReminders(),
        this.processPostEventNotifications(),
      ]);

      this.logger.log('Reminder processing completed successfully');
    } catch (error) {
      this.logger.error('Error processing reminders:', error);
    }
  }

  async sendCustomReminder(
    eventId: string,
    type: ReminderType,
    recipientEmails?: string[],
    customMessage?: string,
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['rsvps'],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    let recipients: string[] = [];

    if (recipientEmails) {
      recipients = recipientEmails;
    } else {
      // Get recipients based on event RSVPs
      const rsvps = await this.rsvpRepository.find({
        where: {
          eventId,
          status: In([RsvpStatus.CONFIRMED, RsvpStatus.ATTENDED]),
        },
      });
      recipients = rsvps.map((rsvp) => rsvp.attendeeEmail);
    }

    const template = this.reminderTemplates.get(type);
    if (!template) {
      throw new Error(`Template not found for reminder type: ${type}`);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of recipients) {
      try {
        const rsvp = event.rsvps?.find((r) => r.attendeeEmail === email);
        const variables = this.buildTemplateVariables(event, rsvp, type);

        let subject = template.subject;
        let htmlContent = customMessage || template.htmlTemplate;
        let textContent = customMessage || template.textTemplate;

        // Replace variables in templates
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          subject = subject.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
          htmlContent = htmlContent.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
          textContent = textContent.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
        }

        // Using any to bypass private method access restriction
        (this.emailNotificationService as any).sendEmail(
          email,
          subject,
          textContent,
          htmlContent,
        );

        this.logReminder({
          id: `${eventId}_${email}_${type}_${Date.now()}`,
          eventId,
          rsvpId: rsvp?.id,
          type,
          recipientEmail: email,
          sentAt: new Date(),
          successful: true,
        });

        sent++;
      } catch (error) {
        const errorMessage = `Failed to send reminder to ${email}: ${error.message}`;
        errors.push(errorMessage);

        this.logReminder({
          id: `${eventId}_${email}_${type}_${Date.now()}`,
          eventId,
          type,
          recipientEmail: email,
          sentAt: new Date(),
          successful: false,
          error: errorMessage,
        });

        failed++;
      }
    }

    this.logger.log(
      `Custom reminder sent: ${sent} successful, ${failed} failed`,
    );

    return { sent, failed, errors };
  }

  async getReminderLogs(
    eventId?: string,
    days: number = 30,
  ): Promise<ReminderLog[]> {
    const allLogs: ReminderLog[] = [];

    for (const [key, logs] of this.reminderLogs) {
      if (!eventId || key.startsWith(eventId)) {
        const recentLogs = logs.filter((log) => {
          const daysDiff =
            (Date.now() - log.sentAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= days;
        });
        allLogs.push(...recentLogs);
      }
    }

    return allLogs.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  async getReminderStatistics(eventId?: string): Promise<{
    totalSent: number;
    successRate: number;
    remindersByType: Record<ReminderType, number>;
    recentActivity: { date: string; count: number }[];
  }> {
    const logs = await this.getReminderLogs(eventId);

    const totalSent = logs.length;
    const successful = logs.filter((log) => log.successful).length;
    const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;

    const remindersByType: Record<ReminderType, number> = {} as any;
    Object.values(ReminderType).forEach((type) => {
      remindersByType[type] = logs.filter((log) => log.type === type).length;
    });

    // Recent activity (last 7 days)
    const recentActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = logs.filter((log) => {
        const logDate = log.sentAt.toISOString().split('T')[0];
        return logDate === dateStr;
      }).length;

      recentActivity.push({ date: dateStr, count });
    }

    return {
      totalSent,
      successRate,
      remindersByType,
      recentActivity,
    };
  }

  private async processEarlyReminders(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(
      targetDate.getDate() + this.defaultSettings.timing.earlyReminder,
    );

    const events = await this.getEventsForReminder(
      targetDate,
      ReminderType.EARLY_REMINDER,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.EARLY_REMINDER);
    }
  }

  private async processRegularReminders(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(
      targetDate.getDate() + this.defaultSettings.timing.reminder,
    );

    const events = await this.getEventsForReminder(
      targetDate,
      ReminderType.REMINDER,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.REMINDER);
    }
  }

  private async processFinalReminders(): Promise<void> {
    const targetDate = new Date();
    targetDate.setHours(
      targetDate.getHours() + this.defaultSettings.timing.finalReminder,
    );

    const events = await this.getEventsForReminder(
      targetDate,
      ReminderType.FINAL_REMINDER,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.FINAL_REMINDER);
    }
  }

  private async processPostEventNotifications(): Promise<void> {
    await Promise.all([
      this.processThankYouNotifications(),
      this.processFeedbackRequests(),
      this.processFollowUpNotifications(),
    ]);
  }

  private async processThankYouNotifications(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(
      targetDate.getDate() - this.defaultSettings.timing.thankYou,
    );

    const events = await this.getEventsForPostReminder(
      targetDate,
      ReminderType.POST_EVENT_THANK_YOU,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.POST_EVENT_THANK_YOU);
    }
  }

  private async processFeedbackRequests(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(
      targetDate.getDate() - this.defaultSettings.timing.feedbackRequest,
    );

    const events = await this.getEventsForPostReminder(
      targetDate,
      ReminderType.POST_EVENT_FEEDBACK,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.POST_EVENT_FEEDBACK);
    }
  }

  private async processFollowUpNotifications(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(
      targetDate.getDate() - this.defaultSettings.timing.followUp,
    );

    const events = await this.getEventsForPostReminder(
      targetDate,
      ReminderType.POST_EVENT_FOLLOW_UP,
    );

    for (const event of events) {
      await this.sendEventReminders(event, ReminderType.POST_EVENT_FOLLOW_UP);
    }
  }

  private async getEventsForReminder(
    targetDate: Date,
    reminderType: ReminderType,
  ): Promise<Event[]> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.eventRepository.find({
      where: {
        startDate: Between(startOfDay, endOfDay),
        status: EventStatus.PUBLISHED,
      },
      relations: ['rsvps'],
    });
  }

  private async getEventsForPostReminder(
    targetDate: Date,
    reminderType: ReminderType,
  ): Promise<Event[]> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.eventRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        status: EventStatus.COMPLETED,
      },
      relations: ['rsvps'],
    });
  }

  private async sendEventReminders(
    event: Event,
    type: ReminderType,
  ): Promise<void> {
    // Check if reminders already sent for this event and type
    const logKey = `${event.id}_${type}`;
    if (this.reminderLogs.has(logKey)) {
      return; // Already sent
    }

    const rsvps = await this.rsvpRepository.find({
      where: {
        eventId: event.id,
        status: In(this.getTargetRsvpStatuses(type)),
      },
    });

    if (
      rsvps.length < this.defaultSettings.conditions.minAttendeesForReminder
    ) {
      return; // Not enough attendees
    }

    const template = this.reminderTemplates.get(type);
    if (!template) {
      this.logger.warn(`Template not found for reminder type: ${type}`);
      return;
    }

    for (const rsvp of rsvps) {
      try {
        const variables = this.buildTemplateVariables(event, rsvp, type);

        let subject = template.subject;
        let htmlContent = template.htmlTemplate;
        let textContent = template.textTemplate;

        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          subject = subject.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
          htmlContent = htmlContent.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
          textContent = textContent.replace(
            new RegExp(placeholder, 'g'),
            String(value),
          );
        }

        // Using any to bypass private method access restriction
        (this.emailNotificationService as any).sendEmail(
          rsvp.attendeeEmail,
          subject,
          textContent,
          htmlContent,
        );

        this.logReminder({
          id: `${event.id}_${rsvp.id}_${type}_${Date.now()}`,
          eventId: event.id,
          rsvpId: rsvp.id,
          type,
          recipientEmail: rsvp.attendeeEmail,
          sentAt: new Date(),
          successful: true,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send reminder to ${rsvp.attendeeEmail}:`,
          error,
        );

        this.logReminder({
          id: `${event.id}_${rsvp.id}_${type}_${Date.now()}`,
          eventId: event.id,
          rsvpId: rsvp.id,
          type,
          recipientEmail: rsvp.attendeeEmail,
          sentAt: new Date(),
          successful: false,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Sent ${type} reminders for event: ${event.title} to ${rsvps.length} recipients`,
    );
  }

  private getTargetRsvpStatuses(type: ReminderType): RsvpStatus[] {
    switch (type) {
      case ReminderType.EARLY_REMINDER:
      case ReminderType.REMINDER:
      case ReminderType.FINAL_REMINDER:
        return [RsvpStatus.CONFIRMED];

      case ReminderType.POST_EVENT_THANK_YOU:
      case ReminderType.POST_EVENT_FEEDBACK:
      case ReminderType.POST_EVENT_FOLLOW_UP:
        return this.defaultSettings.conditions.sendToCheckedIn
          ? [RsvpStatus.ATTENDED]
          : [RsvpStatus.CONFIRMED, RsvpStatus.ATTENDED];

      default:
        return [RsvpStatus.CONFIRMED];
    }
  }

  private buildTemplateVariables(
    event: Event,
    rsvp?: EventRsvp,
    type?: ReminderType,
  ): Record<string, any> {
    const baseVariables: Record<string, any> = {
      eventTitle: event.title,
      eventDescription: event.description,
      eventDate: event.startDate.toLocaleDateString(),
      eventTime: event.startDate.toLocaleTimeString(),
      eventDateTime: event.startDate.toLocaleString(),
      location: event.location,
      organizer: event.organizerName || 'Event Organizer',
      organizerEmail: event.organizerEmail || '',
      attendeeName: rsvp?.attendeeName || 'Attendee',
      attendeeEmail: rsvp?.attendeeEmail || '',
      eventUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}`,
    };

    // Add type-specific variables
    if (type === ReminderType.POST_EVENT_FEEDBACK) {
      baseVariables.feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}/feedback`;
    }

    if (type === ReminderType.POST_EVENT_FOLLOW_UP) {
      baseVariables.resources =
        event.description || 'Event resources will be available soon.';
    }

    if (this.defaultSettings.customization.includeAgenda && event.description) {
      baseVariables.agenda = event.description;
    }

    return baseVariables;
  }

  private logReminder(log: ReminderLog): void {
    const eventKey = log.eventId;
    if (!this.reminderLogs.has(eventKey)) {
      this.reminderLogs.set(eventKey, []);
    }
    this.reminderLogs.get(eventKey)!.push(log);
  }

  // Template methods (simplified versions)
  private getEarlyReminderTemplate(): string {
    return `
      <html>
        <body>
          <h2>Upcoming Event Reminder</h2>
          <p>Hi {{attendeeName}},</p>
          <p>This is a friendly reminder that you're registered for <strong>{{eventTitle}}</strong>.</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <h3>Event Details:</h3>
            <p><strong>Date:</strong> {{eventDate}}</p>
            <p><strong>Time:</strong> {{eventTime}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>
          <p>We're looking forward to seeing you there!</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getEarlyReminderTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      This is a friendly reminder that you're registered for {{eventTitle}}.

      Event Details:
      Date: {{eventDate}}
      Time: {{eventTime}}
      Location: {{location}}

      We're looking forward to seeing you there!

      Best regards,
      {{organizer}}
    `;
  }

  private getReminderTemplate(): string {
    return `
      <html>
        <body>
          <h2>Event Tomorrow: {{eventTitle}}</h2>
          <p>Hi {{attendeeName}},</p>
          <p>Just a reminder that <strong>{{eventTitle}}</strong> is happening tomorrow!</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <h3>Event Details:</h3>
            <p><strong>Date:</strong> {{eventDate}}</p>
            <p><strong>Time:</strong> {{eventTime}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>
          {{#if agenda}}<p><strong>Agenda:</strong> {{agenda}}</p>{{/if}}
          <p>Don't forget to bring any required materials!</p>
          <p>See you tomorrow!</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getReminderTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      Just a reminder that {{eventTitle}} is happening tomorrow!

      Event Details:
      Date: {{eventDate}}
      Time: {{eventTime}}
      Location: {{location}}

      Don't forget to bring any required materials!

      See you tomorrow!

      Best regards,
      {{organizer}}
    `;
  }

  private getFinalReminderTemplate(): string {
    return `
      <html>
        <body>
          <h2>Starting Soon: {{eventTitle}}</h2>
          <p>Hi {{attendeeName}},</p>
          <p><strong>{{eventTitle}}</strong> is starting in just a few hours!</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <h3>Event Details:</h3>
            <p><strong>Time:</strong> {{eventTime}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>
          <p>Please arrive on time. We can't wait to see you!</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getFinalReminderTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      {{eventTitle}} is starting in just a few hours!

      Time: {{eventTime}}
      Location: {{location}}

      Please arrive on time. We can't wait to see you!

      Best regards,
      {{organizer}}
    `;
  }

  private getThankYouTemplate(): string {
    return `
      <html>
        <body>
          <h2>Thank You for Attending!</h2>
          <p>Hi {{attendeeName}},</p>
          <p>Thank you for attending <strong>{{eventTitle}}</strong>!</p>
          <p>We hope you found the event valuable and enjoyable.</p>
          <p>Stay tuned for upcoming events and opportunities.</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getThankYouTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      Thank you for attending {{eventTitle}}!

      We hope you found the event valuable and enjoyable.

      Stay tuned for upcoming events and opportunities.

      Best regards,
      {{organizer}}
    `;
  }

  private getFeedbackRequestTemplate(): string {
    return `
      <html>
        <body>
          <h2>Your Feedback Matters</h2>
          <p>Hi {{attendeeName}},</p>
          <p>We hope you enjoyed <strong>{{eventTitle}}</strong>!</p>
          <p>Your feedback is important to us and helps us improve future events.</p>
          <p><a href="{{feedbackUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">Share Your Feedback</a></p>
          <p>Thank you for taking the time to help us improve!</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getFeedbackRequestTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      We hope you enjoyed {{eventTitle}}!

      Your feedback is important to us and helps us improve future events.

      Please share your feedback at: {{feedbackUrl}}

      Thank you for taking the time to help us improve!

      Best regards,
      {{organizer}}
    `;
  }

  private getFollowUpTemplate(): string {
    return `
      <html>
        <body>
          <h2>Follow-up: {{eventTitle}}</h2>
          <p>Hi {{attendeeName}},</p>
          <p>Thank you again for attending <strong>{{eventTitle}}</strong>.</p>
          <p>Here are some resources and next steps that might interest you:</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            {{resources}}
          </div>
          <p>Feel free to reach out if you have any questions!</p>
          <p>Best regards,<br>{{organizer}}</p>
        </body>
      </html>
    `;
  }

  private getFollowUpTextTemplate(): string {
    return `
      Hi {{attendeeName}},

      Thank you again for attending {{eventTitle}}.

      Here are some resources and next steps that might interest you:

      {{resources}}

      Feel free to reach out if you have any questions!

      Best regards,
      {{organizer}}
    `;
  }
}
