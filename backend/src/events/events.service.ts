import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class EventsService {
  private events = [
    { id: '1', name: 'Networking Night', capacity: 50, rsvps: [] },
  ];

  findAll() {
    return this.events;
  }

  rsvp(eventId: string, userId: string) {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) throw new BadRequestException('Event not found');
    if (event.rsvps.length >= event.capacity)
      throw new BadRequestException('Event is at capacity');
    event.rsvps.push(userId as never);
    return { status: 'RSVP confirmed' };
  }
}
