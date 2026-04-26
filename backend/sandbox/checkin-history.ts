import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { WorkspaceLog } from '../workspace/entities/workspace-log.entity';

@Controller('sandbox/checkins')
@UseGuards(JwtAuthGuard)
export class CheckinHistoryController {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logs: Repository<WorkspaceLog>,
  ) {}

  private async getHistory(
    userId: string,
    q: { from?: string; to?: string; workspaceId?: string; page?: string; limit?: string },
  ) {
    const page = Math.max(1, parseInt(q.page ?? '1'));
    const limit = Math.min(100, parseInt(q.limit ?? '20'));

    const where: FindOptionsWhere<WorkspaceLog> = { userId };
    if (q.workspaceId) where.workspaceId = q.workspaceId;
    if (q.from && q.to) where.checkedInAt = Between(new Date(q.from), new Date(q.to));

    const [rows, total] = await this.logs.findAndCount({
      where,
      relations: ['workspace'],
      order: { checkedInAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = rows.map((r) => ({
      workspaceName: r.workspace?.name,
      checkedInAt: r.checkedInAt,
      checkedOutAt: r.checkedOutAt,
      durationMinutes: r.checkedOutAt
        ? Math.round((r.checkedOutAt.getTime() - r.checkedInAt.getTime()) / 60000)
        : null,
    }));

    return { data, total, page, limit };
  }

  @Get('history')
  myHistory(@Req() req: any, @Query() q: any) {
    return this.getHistory(req.user.id, q);
  }

  @Get('history/:userId')
  userHistory(@Param('userId') userId: string, @Query() q: any) {
    return this.getHistory(userId, q);
  }
}
