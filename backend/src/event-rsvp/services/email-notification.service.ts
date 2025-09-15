import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../entities/event.entity';
import { EventRsvp, RsvpStatus } from '../entities/event-rsvp.entity';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailNotificationConfig {
  from: string;
  replyTo?: string;
  companyName: string;
  supportEmail: string;
  baseUrl: string;
}

export enum NotificationType {
  RSVP_CONFIRMATION = 'rsvp_confirmation',
  RSVP_WAITLISTED = 'rsvp_waitlisted',
  PROMOTED_FROM_WAITLIST = 'promoted_from_waitlist',
  RSVP_CANCELLED = 'rsvp_cancelled',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATED = 'event_updated',
  EVENT_CANCELLED = 'event_cancelled',
  CHECK_IN_CONFIRMATION = 'check_in_confirmation',
  FEEDBACK_REQUEST = 'feedback_request',
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  private readonly config: EmailNotificationConfig = {
    from: 'noreply@managehub.com',
    replyTo: 'support@managehub.com',
    companyName: 'ManageHub',
    supportEmail: 'support@managehub.com',
    baseUrl: process.env.FRONTEND_URL || 'https://managehub.com',
  };

  constructor() {
    // In a real implementation, you would inject email service providers like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - NodeMailer
  }

  async sendRsvpConfirmation(rsvp: EventRsvp, event: Event): Promise<void> {
    try {
      const template = this.generateRsvpConfirmationTemplate(rsvp, event);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `RSVP confirmation email sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send RSVP confirmation email: ${error.message}`,
      );
      throw error;
    }
  }

  async sendWaitlistNotification(rsvp: EventRsvp, event: Event): Promise<void> {
    try {
      const template = this.generateWaitlistTemplate(rsvp, event);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Waitlist notification sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send waitlist notification: ${error.message}`,
      );
      throw error;
    }
  }

  async sendPromotionFromWaitlist(
    rsvp: EventRsvp,
    event: Event,
  ): Promise<void> {
    try {
      const template = this.generatePromotionTemplate(rsvp, event);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Waitlist promotion email sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send promotion notification: ${error.message}`,
      );
      throw error;
    }
  }

  async sendEventReminder(
    rsvp: EventRsvp,
    event: Event,
    hoursBeforeEvent: number,
  ): Promise<void> {
    try {
      const template = this.generateReminderTemplate(
        rsvp,
        event,
        hoursBeforeEvent,
      );
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Event reminder sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send event reminder: ${error.message}`);
      throw error;
    }
  }

  async sendEventUpdate(
    rsvp: EventRsvp,
    event: Event,
    updateMessage: string,
  ): Promise<void> {
    try {
      const template = this.generateUpdateTemplate(rsvp, event, updateMessage);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Event update email sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send event update: ${error.message}`);
      throw error;
    }
  }

  async sendEventCancellation(
    rsvp: EventRsvp,
    event: Event,
    reason?: string,
  ): Promise<void> {
    try {
      const template = this.generateCancellationTemplate(rsvp, event, reason);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Event cancellation email sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send cancellation notification: ${error.message}`,
      );
      throw error;
    }
  }

  async sendCheckInConfirmation(rsvp: EventRsvp, event: Event): Promise<void> {
    try {
      const template = this.generateCheckInTemplate(rsvp, event);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Check-in confirmation sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send check-in confirmation: ${error.message}`,
      );
      throw error;
    }
  }

  async sendFeedbackRequest(
    rsvp: EventRsvp,
    event: Event,
    feedbackUrl: string,
  ): Promise<void> {
    try {
      const template = this.generateFeedbackTemplate(rsvp, event, feedbackUrl);
      await this.sendEmail(
        rsvp.attendeeEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
      );

      this.logger.log(
        `Feedback request sent to ${rsvp.attendeeEmail} for event ${event.title}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send feedback request: ${error.message}`);
      throw error;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    // In a real implementation, this would integrate with actual email service
    // For now, we'll just log the email content
    this.logger.debug(`
      === EMAIL NOTIFICATION ===
      To: ${to}
      Subject: ${subject}
      Content: ${textContent.substring(0, 200)}...
      ========================
    `);

    // Example integration with email service:
    /*
    await this.emailProvider.send({
      from: this.config.from,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      replyTo: this.config.replyTo,
    });
    */
  }

  private generateRsvpConfirmationTemplate(
    rsvp: EventRsvp,
    event: Event,
  ): EmailTemplate {
    const subject = `✅ RSVP Confirmed: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

Your RSVP for "${event.title}" has been confirmed!

Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}
👥 Capacity: ${event.capacity} attendees

${rsvp.specialRequests ? `Special Requests: ${rsvp.specialRequests}` : ''}

We're excited to see you there!

Best regards,
The ${this.config.companyName} Team

Need help? Contact us at ${this.config.supportEmail}
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E7D32;">✅ RSVP Confirmed</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>Your RSVP for "<strong>${event.title}</strong>" has been confirmed!</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
          <p><strong>👥 Capacity:</strong> ${event.capacity} attendees</p>
          ${rsvp.specialRequests ? `<p><strong>Special Requests:</strong> ${rsvp.specialRequests}</p>` : ''}
        </div>
        
        <p>We're excited to see you there!</p>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          Need help? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a>
        </p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateWaitlistTemplate(
    rsvp: EventRsvp,
    event: Event,
  ): EmailTemplate {
    const subject = `📝 Waitlisted: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

Thank you for your interest in "${event.title}"!

The event is currently at full capacity, but you've been added to the waitlist at position #${rsvp.waitlistPosition}.

We'll notify you immediately if a spot becomes available.

Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}
👥 Capacity: ${event.capacity} attendees

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">📝 Added to Waitlist</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>Thank you for your interest in "<strong>${event.title}</strong>"!</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF9800;">
          <p>The event is currently at full capacity, but you've been added to the waitlist at position <strong>#${rsvp.waitlistPosition}</strong>.</p>
          <p>We'll notify you immediately if a spot becomes available.</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
          <p><strong>👥 Capacity:</strong> ${event.capacity} attendees</p>
        </div>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generatePromotionTemplate(
    rsvp: EventRsvp,
    event: Event,
  ): EmailTemplate {
    const subject = `🎉 Great News! Spot Available: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

Great news! A spot has opened up for "${event.title}" and you've been moved from the waitlist to confirmed!

Your attendance is now confirmed for this event.

Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}

We're excited to see you there!

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">🎉 Great News!</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <p>A spot has opened up for "<strong>${event.title}</strong>" and you've been moved from the waitlist to confirmed!</p>
          <p><strong>Your attendance is now confirmed for this event.</strong></p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
        </div>
        
        <p>We're excited to see you there!</p>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateReminderTemplate(
    rsvp: EventRsvp,
    event: Event,
    hoursBeforeEvent: number,
  ): EmailTemplate {
    const subject = `⏰ Reminder: ${event.title} starts in ${hoursBeforeEvent} hours`;

    const textContent = `
Hi ${rsvp.attendeeName},

This is a friendly reminder that "${event.title}" starts in ${hoursBeforeEvent} hours!

Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}

${event.agenda ? `Agenda: ${event.agenda}` : ''}
${event.requirements ? `Requirements: ${event.requirements}` : ''}

See you soon!

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">⏰ Event Reminder</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>This is a friendly reminder that "<strong>${event.title}</strong>" starts in <strong>${hoursBeforeEvent} hours</strong>!</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
          ${event.agenda ? `<p><strong>Agenda:</strong> ${event.agenda}</p>` : ''}
          ${event.requirements ? `<p><strong>Requirements:</strong> ${event.requirements}</p>` : ''}
        </div>
        
        <p>See you soon!</p>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateUpdateTemplate(
    rsvp: EventRsvp,
    event: Event,
    updateMessage: string,
  ): EmailTemplate {
    const subject = `📢 Event Update: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

There's an important update regarding "${event.title}":

${updateMessage}

Updated Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}

If you have any questions, please don't hesitate to contact us.

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">📢 Event Update</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>There's an important update regarding "<strong>${event.title}</strong>":</p>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <p>${updateMessage}</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Updated Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateCancellationTemplate(
    rsvp: EventRsvp,
    event: Event,
    reason?: string,
  ): EmailTemplate {
    const subject = `❌ Event Cancelled: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

We regret to inform you that "${event.title}" has been cancelled.

${reason ? `Reason: ${reason}` : ''}

We apologize for any inconvenience this may cause. We'll keep you informed about future events.

If you have any questions, please contact us at ${this.config.supportEmail}.

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">❌ Event Cancelled</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
          <p>We regret to inform you that "<strong>${event.title}</strong>" has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p>We apologize for any inconvenience this may cause. We'll keep you informed about future events.</p>
        
        <p>If you have any questions, please contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a>.</p>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateCheckInTemplate(
    rsvp: EventRsvp,
    event: Event,
  ): EmailTemplate {
    const subject = `✅ Check-in Confirmed: ${event.title}`;

    const textContent = `
Hi ${rsvp.attendeeName},

You've been successfully checked in to "${event.title}"!

Thank you for attending. We hope you have a great experience.

Event Details:
📅 Date: ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}
📍 Location: ${event.location}
⏰ Checked in at: ${rsvp.checkedInAt?.toLocaleString()}

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Check-in Confirmed</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>You've been successfully checked in to "<strong>${event.title}</strong>"!</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <p>Thank you for attending. We hope you have a great experience.</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>📅 Date:</strong> ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
          <p><strong>⏰ Checked in at:</strong> ${rsvp.checkedInAt?.toLocaleString()}</p>
        </div>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }

  private generateFeedbackTemplate(
    rsvp: EventRsvp,
    event: Event,
    feedbackUrl: string,
  ): EmailTemplate {
    const subject = `📝 How was ${event.title}? Share your feedback`;

    const textContent = `
Hi ${rsvp.attendeeName},

Thank you for attending "${event.title}"!

We'd love to hear about your experience. Your feedback helps us improve future events.

Please take a moment to share your thoughts: ${feedbackUrl}

Best regards,
The ${this.config.companyName} Team
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9C27B0;">📝 Share Your Feedback</h2>
        <p>Hi ${rsvp.attendeeName},</p>
        <p>Thank you for attending "<strong>${event.title}</strong>"!</p>
        
        <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9C27B0;">
          <p>We'd love to hear about your experience. Your feedback helps us improve future events.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${feedbackUrl}" style="background: #9C27B0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Share Your Feedback
          </a>
        </div>
        
        <p>Best regards,<br>The ${this.config.companyName} Team</p>
      </div>
    `;

    return { subject, htmlContent, textContent };
  }
}
