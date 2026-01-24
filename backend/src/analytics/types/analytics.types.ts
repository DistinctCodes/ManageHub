/**
 * Analytics Types
 * Type definitions for analytics data structures
 */

// Time period for aggregation
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Export format types
export type ExportFormat = 'csv' | 'excel' | 'pdf';

// Report types
export type ReportType =
  | 'dashboard'
  | 'attendance'
  | 'revenue'
  | 'members'
  | 'occupancy';

// Trend direction
export type TrendDirection = 'up' | 'down' | 'stable';

// Base analytics response
export interface AnalyticsResponse<T> {
  data: T;
  period: {
    startDate: Date;
    endDate: Date;
    aggregation: AggregationPeriod;
  };
  generatedAt: Date;
  cached: boolean;
}

// Dashboard Overview Stats
export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  memberGrowthPercentage: number;
  totalAttendanceToday: number;
  averageAttendanceRate: number;
  totalRevenue: number;
  revenueGrowthPercentage: number;
  occupancyRate: number;
  peakHours: string[];
}

// Attendance Analytics
export interface AttendanceMetrics {
  totalCheckIns: number;
  totalCheckOuts: number;
  averageWorkHours: number;
  attendanceRate: number;
  lateArrivals: number;
  earlyDepartures: number;
  trends: AttendanceTrend[];
  peakHours: HourlyDistribution[];
  peakDays: DailyDistribution[];
}

export interface AttendanceTrend {
  date: string;
  checkIns: number;
  checkOuts: number;
  averageHours: number;
  attendanceRate: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
  percentage: number;
}

export interface DailyDistribution {
  dayOfWeek: number;
  dayName: string;
  count: number;
  percentage: number;
}

// Revenue Analytics
export interface RevenueMetrics {
  totalRevenue: number;
  averageRevenue: number;
  revenueGrowth: number;
  revenueGrowthPercentage: number;
  projectedRevenue: number;
  trends: RevenueTrend[];
  revenueBySource: RevenueSource[];
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  transactions: number;
  averageTransaction: number;
}

export interface RevenueSource {
  source: string;
  amount: number;
  percentage: number;
  transactions: number;
}

// Member Analytics
export interface MemberMetrics {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembers: number;
  churnedMembers: number;
  retentionRate: number;
  churnRate: number;
  averageMemberAge: number;
  memberGrowth: MemberGrowthTrend[];
  membersByRole: MemberRoleDistribution[];
  cohortAnalysis: CohortData[];
}

export interface MemberGrowthTrend {
  date: string;
  totalMembers: number;
  newMembers: number;
  churnedMembers: number;
  netGrowth: number;
}

export interface MemberRoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

export interface CohortData {
  cohortMonth: string;
  totalMembers: number;
  retentionByMonth: number[];
}

// Occupancy Analytics
export interface OccupancyMetrics {
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  averageOccupancy: number;
  peakOccupancy: number;
  trends: OccupancyTrend[];
  heatmap: OccupancyHeatmapData[];
  utilizationByArea: AreaUtilization[];
}

export interface OccupancyTrend {
  date: string;
  occupancy: number;
  occupancyRate: number;
}

export interface OccupancyHeatmapData {
  dayOfWeek: number;
  hour: number;
  occupancy: number;
  occupancyRate: number;
}

export interface AreaUtilization {
  area: string;
  capacity: number;
  averageOccupancy: number;
  utilizationRate: number;
}

// Churn Prediction
export interface ChurnPrediction {
  userId: string;
  userName: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastActivity: Date;
  factors: string[];
}

// Export Result
export interface ExportResult {
  fileName: string;
  filePath: string;
  format: ExportFormat;
  size: number;
  generatedAt: Date;
}

// Scheduled Report Config
export interface ScheduledReportConfig {
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: ExportFormat;
  includeCharts: boolean;
}
