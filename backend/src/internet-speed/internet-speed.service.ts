import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InternetSpeedResult } from './entities/internet-speed.entity';
import { Repository } from 'typeorm';
import { CreateInternetSpeedDto } from './dto/create-internet-speed.dto';

@Injectable()
export class InternetSpeedService {
  constructor(
    @InjectRepository(InternetSpeedResult)
    private readonly speedRepo: Repository<InternetSpeedResult>,
  ) {}

  async recordSpeed(dto: CreateInternetSpeedDto) {
    const result = this.speedRepo.create(dto);
    return await this.speedRepo.save(result);
  }

  async getAll(location?: string) {
    if (location) {
      return await this.speedRepo.find({
        where: { location },
        order: { timestamp: 'DESC' },
      });
    }
    return await this.speedRepo.find({ order: { timestamp: 'DESC' } });
  }
}