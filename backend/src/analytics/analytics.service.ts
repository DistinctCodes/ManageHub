import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AnalyticsOverviewDto } from './dto/overview.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getOverview(): Promise<AnalyticsOverviewDto> {
    const cached =
      await this.cache.get<AnalyticsOverviewDto>('analytics:overview');
    if (cached) return cached;

    const result: AnalyticsOverviewDto = {
      checkIns: await this.getCheckInsStats(),
      activeSubscriptions: await this.getActiveSubscriptions(),
      topWorkspaces: await this.getTopWorkspaces(),
      attendanceRatio: await this.getAttendanceRatio(),
    };

    await this.cache.set('analytics:overview', result, 60); // 1 min cache
    return result;
  }

  private async getCheckInsStats() {
    // Fake data example – replace with real DB query
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      daily: [12, 30, 22, 18, 40, 15, 9],
    };
  }

  private async getActiveSubscriptions() {
    // Replace with actual DB logic
    return 128;
  }

  private async getTopWorkspaces() {
    return [
      { name: 'Design Team', count: 45 },
      { name: 'Marketing', count: 32 },
      { name: 'Engineering', count: 28 },
    ];
  }

  private async getAttendanceRatio() {
    return { staff: 83, users: 167 };
  }
}
