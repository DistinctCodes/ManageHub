import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { WorkspaceLog } from '../entities/workspace-log.entity';
import { AttendanceQueryDto } from '../dto/attendance-query.dto';

export interface PaginatedAttendance {
  data: WorkspaceLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceSummary {
  totalSessions: number;
  totalMinutes: number;
  averageSessionMinutes: number;
  workspacesVisited: number;
}

@Injectable()
export class AttendanceProvider {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logsRepo: Repository<WorkspaceLog>,
  ) {}

  /**
   * Returns a member's own check-in history, newest first.
   */
  async getMemberHistory(
    userId: string,
    query: AttendanceQueryDto,
  ): Promise<PaginatedAttendance> {
    const { workspaceId, from, to, page = 1, limit = 20 } = query;

    const where: FindManyOptions<WorkspaceLog>['where'] = { userId };
    if (workspaceId) (where as Record<string, unknown>).workspaceId = workspaceId;
    if (from && to) {
      (where as Record<string, unknown>).checkedInAt = Between(
        new Date(from),
        new Date(to),
      );
    }

    const [data, total] = await this.logsRepo.findAndCount({
      where,
      order: { checkedInAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['workspace'],
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns aggregate attendance statistics for a member.
   */
  async getMemberSummary(userId: string): Promise<AttendanceSummary> {
    const logs = await this.logsRepo.find({
      where: { userId },
      select: ['durationMinutes', 'workspaceId'],
    });

    const completed = logs.filter((l) => l.durationMinutes != null);
    const totalMinutes = completed.reduce(
      (sum, l) => sum + (l.durationMinutes ?? 0),
      0,
    );
    const workspacesVisited = new Set(logs.map((l) => l.workspaceId)).size;

    return {
      totalSessions: logs.length,
      totalMinutes,
      averageSessionMinutes:
        completed.length > 0
          ? Math.round(totalMinutes / completed.length)
          : 0,
      workspacesVisited,
    };
  }

  /**
   * Admin report: all members' attendance within a date range.
   */
  async getAdminReport(query: AttendanceQueryDto): Promise<PaginatedAttendance> {
    const { workspaceId, from, to, page = 1, limit = 20 } = query;

    const where: FindManyOptions<WorkspaceLog>['where'] = {};
    if (workspaceId) (where as Record<string, unknown>).workspaceId = workspaceId;
    if (from && to) {
      (where as Record<string, unknown>).checkedInAt = Between(
        new Date(from),
        new Date(to),
      );
    }

    const [data, total] = await this.logsRepo.findAndCount({
      where,
      order: { checkedInAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['workspace', 'user'],
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}