import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminActionLog } from './admin-action-log.entity';
import { AdminActionType } from './admin-action-type.enum';

export interface RecordAdminActionInput {
  actorId: string;
  action: AdminActionType;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
}

@Injectable()
export class AdminActionLogService {
  constructor(
    @InjectRepository(AdminActionLog)
    private readonly logRepository: Repository<AdminActionLog>,
  ) {}

  async record(input: RecordAdminActionInput): Promise<AdminActionLog> {
    const entry = this.logRepository.create({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      detail: input.detail ?? null,
    });
    return this.logRepository.save(entry);
  }

  list(action?: AdminActionType): Promise<AdminActionLog[]> {
    return this.logRepository.find({
      where: action ? { action } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async count(): Promise<number> {
    return this.logRepository.count();
  }
}
