import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';

export interface HeatmapCell {
  avgOccupants: number;
  utilizationPct: number;
}

export interface OccupancyHeatmap {
  matrix: HeatmapCell[][];  // [dayOfWeek 0-6][hour 0-23]
  totalSeats: number;
  sessionCount: number;
}

@Injectable()
export class OccupancyHeatmapService {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logs: Repository<WorkspaceLog>,
  ) {}

  async getHeatmap(from: Date, to: Date, totalSeats = 1): Promise<OccupancyHeatmap> {
    const records = await this.logs
      .createQueryBuilder('log')
      .where('log.checkInAt >= :from AND log.checkInAt <= :to', { from, to })
      .getMany();

    // 7 days x 24 hours accumulator: [sum, count]
    const acc: [number, number][][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => [0, 0]),
    );

    for (const log of records) {
      const start = new Date(log.checkInAt);
      const end = log.checkOutAt ? new Date(log.checkOutAt) : new Date(start.getTime() + 3600_000);
      let cur = new Date(start);
      while (cur < end) {
        const day = cur.getDay(); // 0=Sun
        const hour = cur.getHours();
        acc[day][hour][0] += 1;
        acc[day][hour][1] += 1;
        cur = new Date(cur.getTime() + 3600_000);
      }
    }

    const matrix: HeatmapCell[][] = acc.map(dayRow =>
      dayRow.map(([sum, cnt]) => ({
        avgOccupants: cnt ? +(sum / cnt).toFixed(2) : 0,
        utilizationPct: cnt ? +((sum / cnt / totalSeats) * 100).toFixed(1) : 0,
      })),
    );

    return { matrix, totalSeats, sessionCount: records.length };
  }
}
