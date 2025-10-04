import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Audit, AuditAction, AuditStatus } from './entities/audit.entity';
import { CreateAuditDto } from './dto/create-audit.dto';
import { QueryAuditDto } from './dto/query-audit.dto';

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  async create(createAuditDto: CreateAuditDto): Promise<Audit> {
    const audit = this.auditRepository.create(createAuditDto);
    return await this.auditRepository.save(audit);
  }

  async log(
    action: AuditAction,
    entityType: string,
    userId?: string,
    entityId?: string,
    status: AuditStatus = AuditStatus.SUCCESS,
    details?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Audit> {
    return await this.create({
      action,
      entityType,
      userId,
      entityId,
      status,
      details,
      metadata,
      ipAddress,
      userAgent,
    });
  }

  async findAll(query: QueryAuditDto): Promise<{ data: Audit[]; total: number; page: number; limit: number }> {
    const { action, entityType, userId, status, startDate, endDate, page = 1, limit = 50 } = query;

    const where: FindOptionsWhere<Audit> = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.timestamp = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.timestamp = Between(new Date(startDate), new Date());
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      relations: ['user'],
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findByUser(userId: string, limit: number = 100): Promise<Audit[]> {
    return await this.auditRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<Audit[]> {
    return await this.auditRepository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.auditRepository.createQueryBuilder('audit');

    if (startDate) {
      query.andWhere('audit.timestamp >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('audit.timestamp <= :endDate', { endDate });
    }

    const totalAudits = await query.getCount();

    const actionStats = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const statusStats = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.status')
      .getRawMany();

    return {
      totalAudits,
      actionStats,
      statusStats,
    };
  }
}