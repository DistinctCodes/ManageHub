import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MonitoringLog } from './monitoring.entity';
import { CreateMonitoringDto } from './create-monitoring.dto';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(MonitoringLog)
    private readonly repo: Repository<MonitoringLog>,
  ) {}

  async createLog(dto: CreateMonitoringDto): Promise<MonitoringLog> {
    const log = this.repo.create(dto);
    return this.repo.save(log);
  }

  async getLogsByUser(userId: number): Promise<MonitoringLog[]> {
    return this.repo.find({ where: { userId } });
  }

  async getLogsByDateRange(start: Date, end: Date): Promise<MonitoringLog[]> {
    return this.repo.find({ where: { timestamp: Between(start, end) } });
  }
}
