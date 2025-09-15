import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventTemplate } from './entities/event-template.entity';
import { EventSeries } from './entities/event-series.entity';
import { EventFeedback } from './entities/event-feedback.entity';
import { EventRsvpController } from './event-rsvp.controller';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';
import { EventTemplateService } from './services/event-template.service';
import { EmailNotificationService } from './services/email-notification.service';
import { EventFeedbackService } from './services/event-feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRsvp, EventTemplate, EventSeries, EventFeedback])],
  controllers: [EventRsvpController],
  providers: [EventService, RsvpService, EventTemplateService, EmailNotificationService, EventFeedbackService],
  exports: [EventService, RsvpService, EventTemplateService, EmailNotificationService, EventFeedbackService],
})
export class EventRsvpModule {}