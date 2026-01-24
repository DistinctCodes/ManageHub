import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AttendanceAnalyticsService } from './services/attendance-analytics.service';
import { RevenueAnalyticsService } from './services/revenue-analytics.service';
import { MemberAnalyticsService } from './services/member-analytics.service';
import { OccupancyAnalyticsService } from './services/occupancy-analytics.service';
import {
  DashboardStats,
  AttendanceMetrics,
  RevenueMetrics,
  MemberMetrics,
  OccupancyMetrics,
  AnalyticsResponse,
  AggregationPeriod,
} from './types/analytics.types';
import {
  AnalyticsQueryDto,
  DashboardQueryDto,
} from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly attendanceAnalytics: AttendanceAnalyticsService,
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly memberAnalytics: MemberAnalyticsService,
    private readonly occupancyAnalytics: OccupancyAnalyticsService,
  ) {}

  async getDashboardStats(
    query: DashboardQueryDto,
    userRole: string,
  ): Promise<AnalyticsResponse<DashboardStats>> {
    const cacheKey = `dashboard:${query.locationId || 'all'}:${userRole}`;

    // Check cache first
    const cached =
      await this.cacheManager.get<AnalyticsResponse<DashboardStats>>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Gather dashboard stats from all services
    const [
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      memberGrowthPercentage,
      totalAttendanceToday,
      totalRevenue,
      revenueGrowthPercentage,
      occupancyRate,
      peakHours,
    ] = await Promise.all([
      this.memberAnalytics.getTotalMembers(),
      this.memberAnalytics.getActiveMembers(),
      this.memberAnalytics.getNewMembersThisMonth(),
      this.memberAnalytics.getMemberGrowthPercentage(),
      this.attendanceAnalytics.getTodayAttendance(),
      this.revenueAnalytics.getTotalRevenue(),
      this.revenueAnalytics.getRevenueGrowthPercentage(),
      this.occupancyAnalytics.getOccupancyRate(),
      this.occupancyAnalytics.getPeakHours(),
    ]);

    // Calculate average attendance rate (placeholder)
    const averageAttendanceRate =
      totalMembers > 0 ? (totalAttendanceToday / totalMembers) * 100 : 0;

    const data: DashboardStats = {
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      memberGrowthPercentage,
      totalAttendanceToday,
      averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
      totalRevenue,
      revenueGrowthPercentage,
      occupancyRate,
      peakHours,
    };

    const response: AnalyticsResponse<DashboardStats> = {
      data,
      period: {
        startDate: new Date(),
        endDate: new Date(),
        aggregation: 'daily',
      },
      generatedAt: new Date(),
      cached: false,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async getAttendanceAnalytics(
    query: AnalyticsQueryDto,
    userRole: string,
  ): Promise<AnalyticsResponse<AttendanceMetrics>> {
    const cacheKey = `attendance:${query.startDate}:${query.endDate}:${query.aggregation}:${query.staffId || 'all'}:${userRole}`;

    const cached =
      await this.cacheManager.get<AnalyticsResponse<AttendanceMetrics>>(
        cacheKey,
      );
    if (cached) {
      return { ...cached, cached: true };
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await this.attendanceAnalytics.getAttendanceMetrics(
      startDate,
      endDate,
      query.aggregation,
      query.staffId,
    );

    const response: AnalyticsResponse<AttendanceMetrics> = {
      data,
      period: {
        startDate,
        endDate,
        aggregation: query.aggregation || 'daily',
      },
      generatedAt: new Date(),
      cached: false,
    };

    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async getRevenueAnalytics(
    query: AnalyticsQueryDto,
    userRole: string,
  ): Promise<AnalyticsResponse<RevenueMetrics>> {
    const cacheKey = `revenue:${query.startDate}:${query.endDate}:${query.aggregation}:${query.locationId || 'all'}:${userRole}`;

    const cached =
      await this.cacheManager.get<AnalyticsResponse<RevenueMetrics>>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await this.revenueAnalytics.getRevenueMetrics(
      startDate,
      endDate,
      query.aggregation,
      query.locationId,
    );

    const response: AnalyticsResponse<RevenueMetrics> = {
      data,
      period: {
        startDate,
        endDate,
        aggregation: query.aggregation || 'daily',
      },
      generatedAt: new Date(),
      cached: false,
    };

    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async getMemberAnalytics(
    query: AnalyticsQueryDto,
    userRole: string,
  ): Promise<AnalyticsResponse<MemberMetrics>> {
    const cacheKey = `members:${query.startDate}:${query.endDate}:${query.aggregation}:${userRole}`;

    const cached =
      await this.cacheManager.get<AnalyticsResponse<MemberMetrics>>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await this.memberAnalytics.getMemberMetrics(
      startDate,
      endDate,
      query.aggregation,
    );

    const response: AnalyticsResponse<MemberMetrics> = {
      data,
      period: {
        startDate,
        endDate,
        aggregation: query.aggregation || 'daily',
      },
      generatedAt: new Date(),
      cached: false,
    };

    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async getOccupancyAnalytics(
    query: AnalyticsQueryDto,
    userRole: string,
  ): Promise<AnalyticsResponse<OccupancyMetrics>> {
    const cacheKey = `occupancy:${query.startDate}:${query.endDate}:${query.aggregation}:${query.locationId || 'all'}:${userRole}`;

    const cached =
      await this.cacheManager.get<AnalyticsResponse<OccupancyMetrics>>(
        cacheKey,
      );
    if (cached) {
      return { ...cached, cached: true };
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await this.occupancyAnalytics.getOccupancyMetrics(
      startDate,
      endDate,
      query.aggregation,
      query.locationId,
    );

    const response: AnalyticsResponse<OccupancyMetrics> = {
      data,
      period: {
        startDate,
        endDate,
        aggregation: query.aggregation || 'daily',
      },
      generatedAt: new Date(),
      cached: false,
    };

    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async invalidateCache(pattern?: string): Promise<void> {
    // Note: For pattern-based invalidation, use del() with specific keys
    // Full cache reset requires store-specific implementation or TTL expiration
    if (pattern) {
      await this.cacheManager.del(pattern);
    }
    // Cache entries will expire based on TTL (5 minutes)
  }
}
