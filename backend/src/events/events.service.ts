import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventProvider } from './providers/create-event.provider';
import { UpdateEventProvider } from './providers/update-event.provider';
import { CancelEventProvider } from './providers/cancel-event.provider';
import { FindEventsProvider, PaginatedEvents } from './providers/find-events.provider';
import { FindEventByIdProvider } from './providers/find-event-by-id.provider';
import { RsvpToEventProvider } from './providers/rsvp-to-event.provider';
import { CancelRsvpProvider } from './providers/cancel-rsvp.provider';
import { FindAttendeesProvider, PaginatedAttendees } from './providers/find-attendees.provider';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';

@Injectable()
export class EventsService {
  constructor(
    private readonly createEventProvider: CreateEventProvider,
    private readonly updateEventProvider: UpdateEventProvider,
    private readonly cancelEventProvider: CancelEventProvider,
    private readonly findEventsProvider: FindEventsProvider,
    private readonly findEventByIdProvider: FindEventByIdProvider,
    private readonly rsvpToEventProvider: RsvpToEventProvider,
    private readonly cancelRsvpProvider: CancelRsvpProvider,
    private readonly findAttendeesProvider: FindAttendeesProvider,
  ) {}

  create(dto: CreateEventDto): Promise<Event> {
    return this.createEventProvider.create(dto);
  }

  update(id: string, dto: UpdateEventDto): Promise<Event> {
    return this.updateEventProvider.update(id, dto);
  }

  cancel(id: string): Promise<Event> {
    return this.cancelEventProvider.cancel(id);
  }

  findAll(page?: number, limit?: number): Promise<PaginatedEvents> {
    return this.findEventsProvider.findAll(page, limit);
  }

  findById(id: string): Promise<Event & { rsvpCount: number }> {
    return this.findEventByIdProvider.findById(id);
  }

  rsvp(eventId: string, userId: string): Promise<EventRsvp> {
    return this.rsvpToEventProvider.rsvp(eventId, userId);
  }

  cancelRsvp(eventId: string, userId: string): Promise<void> {
    return this.cancelRsvpProvider.cancelRsvp(eventId, userId);
  }

  findAttendees(eventId: string, page?: number, limit?: number): Promise<PaginatedAttendees> {
    return this.findAttendeesProvider.findAttendees(eventId, page, limit);
  }
}
