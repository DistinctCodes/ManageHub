/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepo: Repository<AuditLog>,
  ) {}

  async createLog(log: Partial<AuditLog>) {
    const auditLog = this.auditLogsRepo.create(log);
    return this.auditLogsRepo.save(auditLog);
  }

  async findByUser(userId: string) {
    return this.auditLogsRepo.find({ where: { userId }, order: { timestamp: 'DESC' } });
  }
}
