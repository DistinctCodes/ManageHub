import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broadcast } from './entities/broadcast.entity';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { LessThanOrEqual } from 'typeorm';


@Injectable()
export class BroadcastService {
  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcastRepository: Repository<Broadcast>,
  ) {}

  async create(dto: CreateBroadcastDto): Promise<Broadcast> {
    const broadcast = this.broadcastRepository.create(dto);
    return this.broadcastRepository.save(broadcast);
  }

  async findAll(): Promise<Broadcast[]> {
    return this.broadcastRepository.find({
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Broadcast> {
    const broadcast = await this.broadcastRepository.findOne({ where: { id } });
    if (!broadcast) throw new NotFoundException(`Broadcast ${id} not found`);
    return broadcast;
  }

  async update(id: string, dto: UpdateBroadcastDto): Promise<Broadcast> {
    const broadcast = await this.findOne(id);
    Object.assign(broadcast, dto);
    return this.broadcastRepository.save(broadcast);
  }

  async findPendingBroadcasts(currentTime: Date): Promise<Broadcast[]> {
  return this.broadcastRepository.find({
    where: {
      isPublished: false,
      scheduledAt: LessThanOrEqual(currentTime),
    },
  });
}

async save(broadcast: Broadcast): Promise<Broadcast> {
  return this.broadcastRepository.save(broadcast);
}
}


