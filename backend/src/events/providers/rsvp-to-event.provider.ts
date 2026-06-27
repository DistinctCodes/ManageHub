import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';

@Injectable()
export class RsvpToEventProvider {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly eventRsvpsRepository: Repository<EventRsvp>,
  ) {}

  async rsvp(eventId: string, userId: string): Promise<EventRsvp> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found`);
    }

    if (event.isCancelled) {
      throw new BadRequestException('Cannot RSVP to a cancelled event');
    }

    const existing = await this.eventRsvpsRepository.findOne({
      where: { eventId, userId },
    });
    if (existing) {
      throw new ConflictException('You have already RSVPed to this event');
    }

    const rsvpCount = await this.eventRsvpsRepository.count({
      where: { eventId },
    });
    if (rsvpCount >= event.capacity) {
      throw new BadRequestException('Event is at full capacity');
    }

    const rsvp = this.eventRsvpsRepository.create({ eventId, userId });
    return this.eventRsvpsRepository.save(rsvp);
  }
}
