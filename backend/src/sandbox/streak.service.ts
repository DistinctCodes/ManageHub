import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';

export interface StreakResult {
  streak: number;
  lastCheckinDate: string | null;
}

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logRepo: Repository<WorkspaceLog>,
  ) {}

  /**
   * Calculates the current consecutive check-in streak for a user.
   * A streak is the number of calendar days in a row (ending today or yesterday)
   * where the user had at least one check-in. A gap > 1 day resets the streak to 0.
   */
  calculateStreak(dates: Date[]): {
    streak: number;
    lastCheckinDate: Date | null;
  } {
    if (!dates.length) return { streak: 0, lastCheckinDate: null };

    // Deduplicate to calendar-day strings (UTC), then sort descending
    const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
    const days = Array.from(daySet).sort((a, b) => (a > b ? -1 : 1));

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);

    // Streak must start from today or yesterday
    if (days[0] !== today && days[0] !== yesterday) {
      return { streak: 0, lastCheckinDate: new Date(days[0]) };
    }

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86_400_000,
      );
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return { streak, lastCheckinDate: new Date(days[0]) };
  }

  async getStreakForUser(userId: string): Promise<StreakResult> {
    const logs = await this.logRepo.find({
      where: { userId },
      select: ['checkedInAt'],
    });

    const { streak, lastCheckinDate } = this.calculateStreak(
      logs.map((l) => l.checkedInAt),
    );

    return {
      streak,
      lastCheckinDate: lastCheckinDate ? lastCheckinDate.toISOString() : null,
    };
  }
}
