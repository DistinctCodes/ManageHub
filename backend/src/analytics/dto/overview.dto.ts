export class AnalyticsOverviewDto {
  checkIns: { daily: number[]; labels: string[] };
  activeSubscriptions: number;
  topWorkspaces: { name: string; count: number }[];
  attendanceRatio: { staff: number; users: number };
}
