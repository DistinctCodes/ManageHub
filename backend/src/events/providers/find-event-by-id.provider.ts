import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';

@Injectable()
export class FindEventByIdProvider {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly eventRsvpsRepository: Repository<EventRsvp>,
  ) {}

  async findById(id: string): Promise<Event & { rsvpCount: number }> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event "${id}" not found`);
    }

    const rsvpCount = await this.eventRsvpsRepository.count({
      where: { eventId: id },
    });

    return { ...event, rsvpCount };
  }
}
