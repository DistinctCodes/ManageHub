import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { UpdateEventDto } from '../dto/update-event.dto';

@Injectable()
export class UpdateEventProvider {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event "${id}" not found`);
    }

    Object.assign(event, dto);
    return this.eventsRepository.save(event);
  }
}
