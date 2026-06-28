import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({ actorUserId: actorId, action, resourceType, resourceId, metadata, ipAddress: ipAddress ?? null }),
    );
  }

  async findAll(filters: {
    actorId?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, actorId, resourceType, startDate, endDate } = filters;
    const qb = this.repo.createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actorId) qb.andWhere('a.actorUserId = :actorId', { actorId });
    if (resourceType) qb.andWhere('a.resourceType = :resourceType', { resourceType });
    if (startDate) qb.andWhere('a.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('a.createdAt <= :endDate', { endDate });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
