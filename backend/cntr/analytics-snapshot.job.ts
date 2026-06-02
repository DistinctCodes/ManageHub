import { randomUUID } from 'crypto';

export interface PlatformStats {
  totalMembers: number;
  activeBookings: number;
  totalRevenueKobo: number;
  newRegistrations: number;
  checkInsToday: number;
}

export interface AnalyticsSnapshot extends PlatformStats {
  id: string;
  snapshotDate: string;
}

export function buildDailySnapshot(stats: PlatformStats, date: Date): AnalyticsSnapshot {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    ...stats,
    id: randomUUID(),
    snapshotDate: `${year}-${month}-${day}`,
  };
}
