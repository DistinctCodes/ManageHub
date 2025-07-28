export class UsageStatsDto {
  totalRequests: number;
  todayRequests: number;
  dailyLimit: number;
  remainingToday: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  dailyUsage: Array<{ date: string; count: number }>;
}