import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { StreakService } from './streak.service';

export interface ActivityScoreResult {
  score: number;
  breakdown: { checkins: number; bookings: number; streak: number };
}

@Injectable()
export class ActivityScoreService {
  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logRepo: Repository<WorkspaceLog>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly streakService: StreakService,
  ) {}

  /**
   * Score formula:
   *   check-ins in last 30 days × 2
   *   + confirmed bookings in last 30 days × 5
   *   + current streak × 3
   */
  async getActivityScore(userId: string): Promise<ActivityScoreResult> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [checkins, bookings, { streak }] = await Promise.all([
      this.logRepo.count({
        where: { userId, checkedInAt: MoreThanOrEqual(since) },
      }),
      this.bookingRepo.count({
        where: {
          userId,
          status: BookingStatus.CONFIRMED,
          createdAt: MoreThanOrEqual(since),
        },
      }),
      this.streakService.getStreakForUser(userId),
    ]);

    const score = checkins * 2 + bookings * 5 + streak * 3;
    return { score, breakdown: { checkins, bookings, streak } };
  }
}
