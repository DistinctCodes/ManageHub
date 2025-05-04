import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    action: string,
    actorId: string,
    target: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      action,
      actorId,
      target,
      metadata,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(page = 1, limit = 10, actionFilter?: string) {
    const skip = (page - 1) * limit;

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: actionFilter ? { action: actionFilter } : {},
      order: { timestamp: 'DESC' },
      skip,
      take: limit,
    });

    return { data: logs, total, page, limit };
  }
}
