import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRsvp } from '../entities/event-rsvp.entity';

export interface PaginatedAttendees {
  data: EventRsvp[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindAttendeesProvider {
  constructor(
    @InjectRepository(EventRsvp)
    private readonly eventRsvpsRepository: Repository<EventRsvp>,
  ) {}

  async findAttendees(
    eventId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedAttendees> {
    const qb = this.eventRsvpsRepository
      .createQueryBuilder('rsvp')
      .leftJoinAndSelect('rsvp.user', 'user')
      .where('rsvp.eventId = :eventId', { eventId })
      .orderBy('rsvp.rsvpedAt', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
