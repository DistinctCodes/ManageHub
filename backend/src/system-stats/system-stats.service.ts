import { Injectable } from '@nestjs/common';

export interface DailyStatsDto {
  date: string;
  checkIns: number;
  alerts: number;
  maintenance: number;
}

@Injectable()
export class SystemStatsService {
  getDailyStats(): DailyStatsDto {
    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    // Mock values (could randomize for realism)
    return {
      date,
      checkIns: 23,
      alerts: 5,
      maintenance: 2,
    };
  }
}
