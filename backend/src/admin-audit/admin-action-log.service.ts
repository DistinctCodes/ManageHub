import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AdminActionLog } from './admin-action-log.entity';
import { AdminActionType } from './admin-action-type.enum';
import { currentRequestMetadata } from '../common/request-context';

export interface RecordAdminActionInput {
  actorId: string;
  action: AdminActionType;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
  /**
   * Explicit forensic metadata. When omitted the value is taken from the
   * active request context (populated by RequestContextMiddleware), so
   * controllers do not have to thread the request through every call.
   */
  ip?: string | null;
  userAgent?: string | null;
}

export interface ListForExportQuery {
  from?: Date;
  to?: Date;
  action?: AdminActionType;
  limit: number;
}

@Injectable()
export class AdminActionLogService {
  constructor(
    @InjectRepository(AdminActionLog)
    private readonly logRepository: Repository<AdminActionLog>,
  ) {}

  async record(input: RecordAdminActionInput): Promise<AdminActionLog> {
    const requestMetadata = currentRequestMetadata();
    const entry = this.logRepository.create({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      detail: input.detail ?? null,
      ip: input.ip ?? requestMetadata.ip,
      userAgent: input.userAgent ?? requestMetadata.userAgent,
    });
    return this.logRepository.save(entry);
  }

  list(action?: AdminActionType): Promise<AdminActionLog[]> {
    return this.logRepository.find({
      where: action ? { action } : {},
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Newest-first slice used by the CSV export. Applies the same action
   * filter as `list`, plus an optional inclusive createdAt range and a hard
   * row cap so a compliance export cannot be asked to materialise an
   * unbounded result.
   */
  listForExport(query: ListForExportQuery): Promise<AdminActionLog[]> {
    const where: FindOptionsWhere<AdminActionLog> = {};
    if (query.action) {
      where.action = query.action;
    }
    if (query.from && query.to) {
      where.createdAt = Between(query.from, query.to);
    } else if (query.from) {
      where.createdAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.createdAt = LessThanOrEqual(query.to);
    }

    return this.logRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
    });
  }

  async count(): Promise<number> {
    return this.logRepository.count();
  }
}
