import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CreateEventProvider } from './providers/create-event.provider';
import { UpdateEventProvider } from './providers/update-event.provider';
import { CancelEventProvider } from './providers/cancel-event.provider';
import { FindEventsProvider } from './providers/find-events.provider';
import { FindEventByIdProvider } from './providers/find-event-by-id.provider';
import { RsvpToEventProvider } from './providers/rsvp-to-event.provider';
import { CancelRsvpProvider } from './providers/cancel-rsvp.provider';
import { FindAttendeesProvider } from './providers/find-attendees.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventRsvp]),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    CreateEventProvider,
    UpdateEventProvider,
    CancelEventProvider,
    FindEventsProvider,
    FindEventByIdProvider,
    RsvpToEventProvider,
    CancelRsvpProvider,
    FindAttendeesProvider,
  ],
  exports: [EventsService],
})
export class EventsModule {}
