import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceLog } from '../../../workspace-tracking/entities/workspace-log.entity';
import { Workspace } from '../../../workspaces/entities/workspace.entity';
import { OccupancyRateQueryDto } from '../dto/occupancy-query.dto';

const MAX_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1440;

@Injectable()
export class OccupancyRateProvider {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logsRepo: Repository<WorkspaceLog>,
    @InjectRepository(Workspace)
    private readonly workspacesRepo: Repository<Workspace>,
  ) {}

  async getOccupancyRate(query: OccupancyRateQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (from >= to) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const diffDays = (to.getTime() - from.getTime()) / MS_PER_DAY;
    if (diffDays > MAX_DAYS) {
      throw new BadRequestException('Date range must not exceed 90 days');
    }

    const workspace = await this.workspacesRepo.findOne({
      where: { id: query.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${query.workspaceId}" not found`);
    }

    const totalMinutesAvailable =
      Math.ceil(diffDays) * MINUTES_PER_DAY * workspace.totalSeats;

    const result = await this.logsRepo
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.durationMinutes), 0)', 'totalMinutesOccupied')
      .where('log.workspaceId = :workspaceId', {
        workspaceId: query.workspaceId,
      })
      .andWhere('log.checkedOutAt IS NOT NULL')
      .andWhere('log.checkedInAt >= :from', { from })
      .andWhere('log.checkedInAt < :to', { to })
      .getRawOne<{ totalMinutesOccupied: string }>();

    const totalMinutesOccupied = Number(result?.totalMinutesOccupied ?? 0);
    const occupancyRate =
      totalMinutesAvailable > 0
        ? Math.round((totalMinutesOccupied / totalMinutesAvailable) * 10000) /
          100
        : 0;

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      from: query.from,
      to: query.to,
      occupancyRate,
      totalMinutesOccupied,
      totalMinutesAvailable,
    };
  }
}
