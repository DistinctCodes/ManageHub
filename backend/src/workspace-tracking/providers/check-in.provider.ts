import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { WorkspaceLog } from '../entities/workspace-log.entity';
import { CheckInDto } from '../dto/check-in.dto';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Injectable()
export class CheckInProvider {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logsRepository: Repository<WorkspaceLog>,
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
  ) {}

  async checkIn(dto: CheckInDto, userId: string): Promise<WorkspaceLog> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id: dto.workspaceId, isActive: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${dto.workspaceId}" not found`);
    }

    // Prevent duplicate active check-in for same user + workspace
    const activeLog = await this.logsRepository.findOne({
      where: { userId, workspaceId: dto.workspaceId, checkedOutAt: IsNull() },
    });
    if (activeLog) {
      throw new BadRequestException(
        'You already have an active check-in for this workspace',
      );
    }

    const log = this.logsRepository.create({
      userId,
      workspaceId: dto.workspaceId,
      bookingId: dto.bookingId ?? null,
      notes: dto.notes ?? null,
    });

    return this.logsRepository.save(log);
  }

  async checkOut(logId: string, userId: string): Promise<WorkspaceLog> {
    const log = await this.logsRepository.findOne({
      where: { id: logId, userId, checkedOutAt: IsNull() },
    });
    if (!log) {
      throw new NotFoundException(
        'Active check-in not found or already checked out',
      );
    }

    const now = new Date();
    log.checkedOutAt = now;
    log.durationMinutes = Math.round(
      (now.getTime() - log.checkedInAt.getTime()) / 60000,
    );

    return this.logsRepository.save(log);
  }

  async getActiveCheckIn(
    userId: string,
    workspaceId?: string,
  ): Promise<WorkspaceLog | null> {
    const where: Record<string, unknown> = { userId, checkedOutAt: IsNull() };
    if (workspaceId) where.workspaceId = workspaceId;

    return this.logsRepository.findOne({ where: where as any });
  }
}
