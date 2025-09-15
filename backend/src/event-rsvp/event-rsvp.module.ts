import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventTemplate } from './entities/event-template.entity';
import { EventSeries } from './entities/event-series.entity';
import { EventFeedback } from './entities/event-feedback.entity';
import { EventRegistrationForm } from './entities/event-registration-form.entity';
import { EventRegistrationResponse } from './entities/event-registration-response.entity';
import { EventRsvpController } from './event-rsvp.controller';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';
import { EventTemplateService } from './services/event-template.service';
import { EmailNotificationService } from './services/email-notification.service';
import { EventFeedbackService } from './services/event-feedback.service';
import { EventRegistrationService } from './services/event-registration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRsvp, EventTemplate, EventSeries, EventFeedback, EventRegistrationForm, EventRegistrationResponse])],
  controllers: [EventRsvpController],
  providers: [EventService, RsvpService, EventTemplateService, EmailNotificationService, EventFeedbackService, EventRegistrationService],
  exports: [EventService, RsvpService, EventTemplateService, EmailNotificationService, EventFeedbackService, EventRegistrationService],
})
export class EventRsvpModule {}