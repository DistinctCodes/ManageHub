import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiEndpoint } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';

export interface UptimeMetrics {
  endpointId: string;
  endpointName: string;
  url: string;
  provider: string;
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastCheckTime: Date;
  lastFailureTime?: Date;
  meanTimeToRecovery: number; // in minutes
  meanTimeBetweenFailures: number; // in minutes
}

export interface PerformanceMetrics {
  endpointId: string;
  endpointName: string;
  responseTime: {
    average: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  errorRate: number;
  availability: number;
}

export interface IncidentMetrics {
  endpointId: string;
  endpointName: string;
  totalIncidents: number;
  totalDowntime: number; // in minutes
  incidentsByType: Record<PingStatus, number>;
  incidentsByDay: Array<{
    date: string;
    count: number;
    downtime: number;
  }>;
  longestOutage: {
    duration: number; // in minutes
    startTime: Date;
    endTime: Date;
  };
  averageIncidentDuration: number; // in minutes
}

export interface ComparisonMetrics {
  current: UptimeMetrics;
  previous: UptimeMetrics;
  change: {
    uptimePercentage: number;
    averageResponseTime: number;
    totalChecks: number;
    errorRate: number;
  };
}

export interface GlobalMetrics {
  overview: {
    totalEndpoints: number;
    activeEndpoints: number;
    healthyEndpoints: number;
    degradedEndpoints: number;
    downEndpoints: number;
    averageUptime: number;
    averageResponseTime: number;
    totalChecksToday: number;
    totalIncidentsToday: number;
  };
  trends: {
    uptimeTrend: Array<{ date: string; uptime: number }>;
    responseTimeTrend: Array<{ date: string; avgResponseTime: number }>;
    incidentTrend: Array<{ date: string; incidents: number }>;
  };
  topPerformers: UptimeMetrics[];
  worstPerformers: UptimeMetrics[];
}

export interface SLAReport {
  endpointId: string;
  endpointName: string;
  slaTarget: number; // Target uptime percentage
  currentUptime: number;
  slaStatus: 'met' | 'at_risk' | 'breached';
  remainingErrorBudget: number; // Percentage of allowed downtime remaining
  projectedUptime: number; // Projected uptime for the period
  daysUntilSLABreach?: number;
}

@Injectable()
export class ApiAnalyticsService {
  private readonly logger = new Logger(ApiAnalyticsService.name);

  constructor(
    @InjectRepository(ApiEndpoint)
    private endpointRepository: Repository<ApiEndpoint>,
    @InjectRepository(PingResult)
    private pingResultRepository: Repository<PingResult>,
  ) {}

  async getUptimeMetrics(
    endpointId?: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<UptimeMetrics[]> {
    const startDate = this.getStartDate(period);
    
    let query = this.endpointRepository
      .createQueryBuilder('endpoint')
      .leftJoinAndSelect('endpoint.pingResults', 'result', 
        'result.createdAt >= :startDate', { startDate });

    if (endpointId) {
      query = query.where('endpoint.id = :endpointId', { endpointId });
    }

    const endpoints = await query.getMany();

    return endpoints.map(endpoint => this.calculateUptimeMetrics(endpoint, startDate));
  }

  async getPerformanceMetrics(
    endpointId?: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceMetrics[]> {
    const startDate = this.getStartDate(period);
    
    let query = this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.endpoint', 'endpoint')
      .where('result.createdAt >= :startDate', { startDate })
      .andWhere('result.isSuccess = :isSuccess', { isSuccess: true });

    if (endpointId) {
      query = query.andWhere('endpoint.id = :endpointId', { endpointId });
    }

    const results = await query.getMany();
    
    return this.calculatePerformanceMetrics(results, period);
  }

  async getIncidentMetrics(
    endpointId?: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<IncidentMetrics[]> {
    const startDate = this.getStartDate(period);
    
    let query = this.endpointRepository
      .createQueryBuilder('endpoint')
      .leftJoinAndSelect('endpoint.pingResults', 'result', 
        'result.createdAt >= :startDate AND result.isSuccess = :isSuccess', 
        { startDate, isSuccess: false });

    if (endpointId) {
      query = query.where('endpoint.id = :endpointId', { endpointId });
    }

    const endpoints = await query.getMany();

    return endpoints.map(endpoint => this.calculateIncidentMetrics(endpoint, startDate));
  }

  async getComparisonMetrics(
    endpointId: string,
    currentPeriod: '1h' | '24h' | '7d' | '30d' = '24h',
    comparisonPeriod: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<ComparisonMetrics> {
    const [current, previous] = await Promise.all([
      this.getUptimeMetrics(endpointId, currentPeriod),
      this.getUptimeMetrics(endpointId, comparisonPeriod)
    ]);

    const currentMetrics = current[0];
    const previousMetrics = previous[0];

    return {
      current: currentMetrics,
      previous: previousMetrics,
      change: {
        uptimePercentage: currentMetrics.uptimePercentage - previousMetrics.uptimePercentage,
        averageResponseTime: currentMetrics.averageResponseTime - previousMetrics.averageResponseTime,
        totalChecks: currentMetrics.totalChecks - previousMetrics.totalChecks,
        errorRate: (currentMetrics.failedChecks / currentMetrics.totalChecks * 100) - 
                   (previousMetrics.failedChecks / previousMetrics.totalChecks * 100),
      },
    };
  }

  async getGlobalMetrics(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<GlobalMetrics> {
    const startDate = this.getStartDate(period);
    
    // Get overview metrics
    const [
      totalEndpoints,
      activeEndpoints,
      uptimeMetrics,
      todayChecks,
      todayIncidents
    ] = await Promise.all([
      this.endpointRepository.count(),
      this.endpointRepository.count({ where: { isActive: true } }),
      this.getUptimeMetrics(undefined, period),
      this.pingResultRepository.count({ 
        where: { createdAt: startDate }
      }),
      this.pingResultRepository.count({ 
        where: { 
          createdAt: startDate,
          isSuccess: false
        }
      })
    ]);

    // Calculate health distribution
    let healthyEndpoints = 0;
    let degradedEndpoints = 0;
    let downEndpoints = 0;

    uptimeMetrics.forEach(metric => {
      if (metric.uptimePercentage >= 99) {
        healthyEndpoints++;
      } else if (metric.uptimePercentage >= 95) {
        degradedEndpoints++;
      } else {
        downEndpoints++;
      }
    });

    // Calculate averages
    const averageUptime = uptimeMetrics.length > 0
      ? uptimeMetrics.reduce((sum, m) => sum + m.uptimePercentage, 0) / uptimeMetrics.length
      : 100;

    const averageResponseTime = uptimeMetrics.length > 0
      ? uptimeMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / uptimeMetrics.length
      : 0;

    // Get trends
    const trends = await this.calculateTrends(period);

    // Get top and worst performers
    const sortedByUptime = [...uptimeMetrics].sort((a, b) => b.uptimePercentage - a.uptimePercentage);
    const topPerformers = sortedByUptime.slice(0, 5);
    const worstPerformers = sortedByUptime.slice(-5).reverse();

    return {
      overview: {
        totalEndpoints,
        activeEndpoints,
        healthyEndpoints,
        degradedEndpoints,
        downEndpoints,
        averageUptime: Math.round(averageUptime * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        totalChecksToday: todayChecks,
        totalIncidentsToday: todayIncidents,
      },
      trends,
      topPerformers,
      worstPerformers,
    };
  }

  async generateSLAReport(
    endpointId?: string,
    slaTarget: number = 99.9,
    period: '30d' | '90d' = '30d'
  ): Promise<SLAReport[]> {
    const uptimeMetrics = await this.getUptimeMetrics(endpointId, period as any);
    
    return uptimeMetrics.map(metric => {
      const currentUptime = metric.uptimePercentage;
      const slaStatus = this.calculateSLAStatus(currentUptime, slaTarget);
      const remainingErrorBudget = this.calculateRemainingErrorBudget(
        currentUptime, slaTarget, metric.totalChecks
      );
      const projectedUptime = this.projectUptime(metric, period);

      return {
        endpointId: metric.endpointId,
        endpointName: metric.endpointName,
        slaTarget,
        currentUptime,
        slaStatus,
        remainingErrorBudget,
        projectedUptime,
        daysUntilSLABreach: slaStatus === 'at_risk' 
          ? this.calculateDaysUntilBreach(currentUptime, slaTarget, metric)
          : undefined,
      };
    });
  }

  async generateCustomReport(options: {
    endpointIds?: string[];
    providers?: string[];
    startDate: Date;
    endDate: Date;
    includeMetrics: ('uptime' | 'performance' | 'incidents')[];
    groupBy: 'endpoint' | 'provider' | 'day' | 'hour';
  }): Promise<any> {
    const { startDate, endDate, includeMetrics, groupBy } = options;

    let query = this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.endpoint', 'endpoint')
      .where('result.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (options.endpointIds?.length) {
      query = query.andWhere('endpoint.id IN (:...endpointIds)', { 
        endpointIds: options.endpointIds 
      });
    }

    if (options.providers?.length) {
      query = query.andWhere('endpoint.provider IN (:...providers)', { 
        providers: options.providers 
      });
    }

    const results = await query.getMany();

    return this.processCustomReportData(results, includeMetrics, groupBy);
  }

  // Private helper methods
  private calculateUptimeMetrics(endpoint: ApiEndpoint, startDate: Date): UptimeMetrics {
    const results = endpoint.pingResults || [];
    const totalChecks = results.length;
    const successfulChecks = results.filter(r => r.isSuccess).length;
    const failedChecks = totalChecks - successfulChecks;
    
    const responseTimes = results
      .filter(r => r.isSuccess && r.responseTimeMs)
      .map(r => r.responseTimeMs!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    const lastCheckTime = results.length > 0
      ? new Date(Math.max(...results.map(r => r.createdAt.getTime())))
      : new Date();

    const lastFailureTime = results
      .filter(r => !r.isSuccess)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt;

    return {
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      url: endpoint.url,
      provider: endpoint.provider,
      uptimePercentage: totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100,
      totalChecks,
      successfulChecks,
      failedChecks,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime,
      maxResponseTime,
      lastCheckTime,
      lastFailureTime,
      meanTimeToRecovery: this.calculateMTTR(results),
      meanTimeBetweenFailures: this.calculateMTBF(results),
    };
  }

  private calculatePerformanceMetrics(results: PingResult[], period: string): PerformanceMetrics[] {
    const groupedByEndpoint = this.groupResultsByEndpoint(results);
    
    return Object.entries(groupedByEndpoint).map(([endpointId, endpointResults]) => {
      const responseTimes = endpointResults
        .filter(r => r.responseTimeMs)
        .map(r => r.responseTimeMs!)
        .sort((a, b) => a - b);

      const average = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      const median = responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length / 2)]
        : 0;

      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);

      const periodHours = this.getPeriodHours(period);
      const requestsPerHour = endpointResults.length / periodHours;

      return {
        endpointId,
        endpointName: endpointResults[0]?.endpoint?.name || 'Unknown',
        responseTime: {
          average: Math.round(average),
          min: responseTimes.length > 0 ? responseTimes[0] : 0,
          max: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
          median: Math.round(median),
          p95: responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0,
          p99: responseTimes.length > 0 ? responseTimes[p99Index] || 0 : 0,
        },
        throughput: {
          requestsPerHour: Math.round(requestsPerHour * 100) / 100,
          requestsPerDay: Math.round(requestsPerHour * 24 * 100) / 100,
        },
        errorRate: 0, // Only successful results in this dataset
        availability: 100, // Only successful results in this dataset
      };
    });
  }

  private calculateIncidentMetrics(endpoint: ApiEndpoint, startDate: Date): IncidentMetrics {
    const incidents = endpoint.pingResults || [];
    const totalIncidents = incidents.length;

    // Group incidents by type
    const incidentsByType = incidents.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1;
      return acc;
    }, {} as Record<PingStatus, number>);

    // Group incidents by day
    const incidentsByDay = this.groupIncidentsByDay(incidents);

    // Calculate downtime (assuming each incident represents a failed check)
    const totalDowntime = incidents.length * 5; // Assuming 5-minute intervals

    // Find longest outage
    const longestOutage = this.findLongestOutage(incidents);

    return {
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      totalIncidents,
      totalDowntime,
      incidentsByType,
      incidentsByDay,
      longestOutage,
      averageIncidentDuration: totalIncidents > 0 ? totalDowntime / totalIncidents : 0,
    };
  }

  private calculateTrends(period: string): Promise<{
    uptimeTrend: Array<{ date: string; uptime: number }>;
    responseTimeTrend: Array<{ date: string; avgResponseTime: number }>;
    incidentTrend: Array<{ date: string; incidents: number }>;
  }> {
    // TODO: Implement trend calculation logic
    // This would involve grouping data by time periods and calculating metrics
    return Promise.resolve({
      uptimeTrend: [],
      responseTimeTrend: [],
      incidentTrend: [],
    });
  }

  private calculateSLAStatus(currentUptime: number, slaTarget: number): 'met' | 'at_risk' | 'breached' {
    if (currentUptime >= slaTarget) {
      return 'met';
    } else if (currentUptime >= slaTarget - 0.5) {
      return 'at_risk';
    } else {
      return 'breached';
    }
  }

  private calculateRemainingErrorBudget(
    currentUptime: number, 
    slaTarget: number, 
    totalChecks: number
  ): number {
    const allowedFailures = Math.floor(totalChecks * (1 - slaTarget / 100));
    const actualFailures = Math.floor(totalChecks * (1 - currentUptime / 100));
    const remainingFailures = Math.max(0, allowedFailures - actualFailures);
    
    return totalChecks > 0 ? (remainingFailures / totalChecks) * 100 : 0;
  }

  private projectUptime(metric: UptimeMetrics, period: string): number {
    // Simple projection based on current trend
    // In a real implementation, this would use more sophisticated forecasting
    return metric.uptimePercentage;
  }

  private calculateDaysUntilBreach(
    currentUptime: number, 
    slaTarget: number, 
    metric: UptimeMetrics
  ): number {
    // Simple calculation - in reality this would be more complex
    const errorBudget = this.calculateRemainingErrorBudget(currentUptime, slaTarget, metric.totalChecks);
    const dailyFailureRate = metric.failedChecks / 30; // Assuming 30-day period
    
    return errorBudget > 0 && dailyFailureRate > 0 
      ? Math.floor(errorBudget / dailyFailureRate)
      : 0;
  }

  private processCustomReportData(results: PingResult[], includeMetrics: string[], groupBy: string): any {
    // TODO: Implement custom report data processing
    return {
      summary: `Custom report with ${results.length} records`,
      groupBy,
      metrics: includeMetrics,
      data: results.slice(0, 10), // Return sample data
    };
  }

  private calculateMTTR(results: PingResult[]): number {
    // Calculate Mean Time To Recovery
    // TODO: Implement MTTR calculation logic
    return 0;
  }

  private calculateMTBF(results: PingResult[]): number {
    // Calculate Mean Time Between Failures
    // TODO: Implement MTBF calculation logic
    return 0;
  }

  private groupResultsByEndpoint(results: PingResult[]): Record<string, PingResult[]> {
    return results.reduce((acc, result) => {
      if (!acc[result.endpointId]) {
        acc[result.endpointId] = [];
      }
      acc[result.endpointId].push(result);
      return acc;
    }, {} as Record<string, PingResult[]>);
  }

  private groupIncidentsByDay(incidents: PingResult[]): Array<{ date: string; count: number; downtime: number }> {
    const grouped = incidents.reduce((acc, incident) => {
      const date = incident.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, downtime: 0 };
      }
      acc[date].count++;
      acc[date].downtime += 5; // Assuming 5-minute intervals
      return acc;
    }, {} as Record<string, { count: number; downtime: number }>);

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      count: data.count,
      downtime: data.downtime,
    }));
  }

  private findLongestOutage(incidents: PingResult[]): {
    duration: number;
    startTime: Date;
    endTime: Date;
  } {
    if (incidents.length === 0) {
      return { duration: 0, startTime: new Date(), endTime: new Date() };
    }

    // TODO: Implement longest outage calculation
    // This would involve finding consecutive failures and calculating duration
    const firstIncident = incidents[0];
    const lastIncident = incidents[incidents.length - 1];
    
    return {
      duration: incidents.length * 5, // Assuming 5-minute intervals
      startTime: firstIncident.createdAt,
      endTime: lastIncident.createdAt,
    };
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private getPeriodHours(period: string): number {
    switch (period) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      default: return 24;
    }
  }
}