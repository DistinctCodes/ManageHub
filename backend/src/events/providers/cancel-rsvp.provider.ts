import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRsvp } from '../entities/event-rsvp.entity';

@Injectable()
export class CancelRsvpProvider {
  constructor(
    @InjectRepository(EventRsvp)
    private readonly eventRsvpsRepository: Repository<EventRsvp>,
  ) {}

  async cancelRsvp(eventId: string, userId: string): Promise<void> {
    const rsvp = await this.eventRsvpsRepository.findOne({
      where: { eventId, userId },
    });
    if (!rsvp) {
      throw new NotFoundException('RSVP not found');
    }

    await this.eventRsvpsRepository.remove(rsvp);
  }
}
