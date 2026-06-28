import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';

export interface PaginatedEvents {
  data: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindEventsProvider {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async findAll(page = 1, limit = 20): Promise<PaginatedEvents> {
    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.isCancelled = :isCancelled', { isCancelled: false })
      .andWhere('event.startDate >= :now', { now: new Date() })
      .orderBy('event.startDate', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
