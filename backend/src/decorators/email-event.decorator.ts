import { SetMetadata } from '@nestjs/common';
import { EmailType } from '../email/entities/email-log.entity';

export interface EmailEventMetadata {
  eventName: string;
  emailType: EmailType;
  templateName: string;
  priority?: number;
  delay?: number;
}

export const EMAIL_EVENT_KEY = 'email_event';

/**
 * Decorator to mark methods that should trigger email notifications
 * @param metadata - Email event configuration
 *
 * @example
 * ```typescript
 * @EmailEvent({
 *   eventName: 'user.registered',
 *   emailType: EmailType.WELCOME,
 *   templateName: 'welcome',
 *   priority: 1
 * })
 * async registerUser(userData: CreateUserDto) {
 *   // Registration logic
 * }
 * ```
 */
export const EmailEvent = (metadata: EmailEventMetadata) =>
  SetMetadata(EMAIL_EVENT_KEY, metadata);
