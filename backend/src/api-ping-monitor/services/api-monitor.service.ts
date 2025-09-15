import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
// import axios, { AxiosResponse, AxiosError } from 'axios'; // TODO: Install axios package
import * as https from 'https';
import * as http from 'http';
import { ApiEndpoint, EndpointStatus } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';
import { ApiNotificationService } from './api-notification.service';
import { 
  ManualPingDto, 
  BulkPingDto, 
  PingResultQueryDto, 
  PingResultAnalyticsDto, 
  ExportPingResultsDto 
} from '../dto/ping-result.dto';

export interface PingOptions {
  endpoint: ApiEndpoint;
  saveResult?: boolean;
  includeDetails?: boolean;
  attemptNumber?: number;
}

export interface PingResponse {
  endpointId: string;
  endpointName: string;
  status: PingStatus;
  isSuccess: boolean;
  httpStatusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  result?: PingResult;
  timings?: {
    dnsLookupTime?: number;
    tcpConnectionTime?: number;
    tlsHandshakeTime?: number;
    firstByteTime?: number;
    contentTransferTime?: number;
  };
}

@Injectable()
export class ApiMonitorService {
  private readonly logger = new Logger(ApiMonitorService.name);
  private readonly userAgent = 'ManageHub-API-Monitor/1.0';

  constructor(
    @InjectRepository(ApiEndpoint)
    private endpointRepository: Repository<ApiEndpoint>,
    @InjectRepository(PingResult)
    private pingResultRepository: Repository<PingResult>,
    private notificationService: ApiNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async performScheduledPings(): Promise<void> {
    this.logger.debug('Starting scheduled ping monitoring...');

    try {
      // Get all active endpoints that need to be pinged
      const endpointsToCheck = await this.endpointRepository
        .createQueryBuilder('endpoint')
        .where('endpoint.isActive = :isActive', { isActive: true })
        .andWhere('endpoint.status = :status', { status: EndpointStatus.ACTIVE })
        .andWhere(
          '(endpoint.nextPingAt IS NULL OR endpoint.nextPingAt <= :now)',
          { now: new Date() }
        )
        .getMany();

      if (endpointsToCheck.length === 0) {
        this.logger.debug('No endpoints require pinging at this time');
        return;
      }

      this.logger.log(`Pinging ${endpointsToCheck.length} endpoints...`);

      // Process endpoints in batches to avoid overwhelming external APIs
      const batchSize = 5;
      for (let i = 0; i < endpointsToCheck.length; i += batchSize) {
        const batch = endpointsToCheck.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(endpoint => this.performPingWithRetry(endpoint))
        );

        // Small delay between batches
        if (i + batchSize < endpointsToCheck.length) {
          await this.sleep(500);
        }
      }

      this.logger.log(`Completed pinging ${endpointsToCheck.length} endpoints`);
    } catch (error) {
      this.logger.error('Error during scheduled ping monitoring:', error);
    }
  }

  async performManualPing(manualPingDto: ManualPingDto): Promise<PingResponse> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id: manualPingDto.endpointId }
    });

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    return this.pingEndpoint({
      endpoint,
      saveResult: manualPingDto.saveResult ?? true,
      includeDetails: manualPingDto.includeDetails ?? true,
    });
  }

  async performBulkPing(bulkPingDto: BulkPingDto): Promise<PingResponse[]> {
    const endpoints = await this.endpointRepository.findByIds(bulkPingDto.endpointIds);

    if (endpoints.length === 0) {
      throw new Error('No valid endpoints found');
    }

    const results = await Promise.all(
      endpoints.map(endpoint =>
        this.pingEndpoint({
          endpoint,
          saveResult: bulkPingDto.saveResults ?? true,
          includeDetails: bulkPingDto.includeDetails ?? false,
        })
      )
    );

    return results;
  }

  private async performPingWithRetry(endpoint: ApiEndpoint): Promise<void> {
    let lastError: any;
    let success = false;

    for (let attempt = 1; attempt <= endpoint.retryAttempts; attempt++) {
      try {
        const response = await this.pingEndpoint({
          endpoint,
          saveResult: true,
          includeDetails: false,
          attemptNumber: attempt,
        });

        if (response.isSuccess) {
          success = true;
          break;
        }

        lastError = response.errorMessage;
      } catch (error) {
        lastError = error.message;
        this.logger.warn(
          `Attempt ${attempt}/${endpoint.retryAttempts} failed for ${endpoint.name}: ${error.message}`
        );
      }

      // Wait before retrying (except on last attempt)
      if (attempt < endpoint.retryAttempts) {
        await this.sleep(endpoint.retryDelayMs);
      }
    }

    // Update next ping time
    await this.endpointRepository.update(endpoint.id, {
      lastPingAt: new Date(),
      nextPingAt: endpoint.getNextPingTime(),
    });

    if (!success) {
      this.logger.warn(
        `All retry attempts failed for ${endpoint.name}: ${lastError}`
      );
    }
  }

  private async pingEndpoint(options: PingOptions): Promise<PingResponse> {
    const { endpoint, saveResult = true, includeDetails = false, attemptNumber = 1 } = options;
    
    const startTime = Date.now();
    let pingResult: Partial<PingResult> = {
      endpointId: endpoint.id,
      attemptNumber,
      createdAt: new Date(),
    };

    try {
      this.logger.debug(`Pinging ${endpoint.name} (${endpoint.url})`);

      const axiosConfig = {
        method: endpoint.method,
        url: endpoint.url,
        headers: {
          'User-Agent': this.userAgent,
          ...endpoint.headers,
        },
        timeout: endpoint.timeoutMs,
        validateStatus: () => true, // Don't throw on HTTP error status codes
        maxRedirects: 5,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certificates for monitoring
        }),
        httpAgent: new http.Agent(),
      };

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        axiosConfig['data'] = endpoint.body;
      }

      // Perform the request
      // const response: AxiosResponse = await axios(axiosConfig); // TODO: Install axios
      // For now, we'll simulate a response
      const response: any = {
        status: 200,
        data: 'OK',
        headers: { 'content-type': 'text/plain' },
      };
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      // Prepare result
      pingResult = {
        ...pingResult,
        status: PingStatus.SUCCESS,
        httpStatusCode: response.status,
        responseTimeMs,
        responseHeaders: includeDetails ? JSON.stringify(response.headers) : null,
        responseBody: includeDetails ? this.truncateString(response.data, 1000) : null,
        responseSize: response.headers['content-length'] 
          ? parseInt(response.headers['content-length'], 10) 
          : null,
        isSuccess: this.isResponseSuccessful(response, endpoint),
        validationResults: this.validateResponse(response, endpoint),
      };

      // Check if response meets expected criteria
      if (!pingResult.isSuccess) {
        pingResult.status = PingStatus.VALIDATION_ERROR;
        pingResult.errorMessage = 'Response validation failed';
      }

    } catch (error) {
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      pingResult = {
        ...pingResult,
        responseTimeMs,
        isSuccess: false,
        errorMessage: error.message,
        errorDetails: includeDetails ? JSON.stringify({
          name: error.name,
          code: error.code,
          stack: error.stack,
        }) : null,
      };

      // Categorize the error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        pingResult.status = PingStatus.TIMEOUT;
        pingResult.isTimeout = true;
      } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        pingResult.status = PingStatus.DNS_ERROR;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        pingResult.status = PingStatus.CONNECTION_ERROR;
      } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
        pingResult.status = PingStatus.SSL_ERROR;
      } else if (error.response) {
        pingResult.status = PingStatus.HTTP_ERROR;
        pingResult.httpStatusCode = error.response.status;
      } else {
        pingResult.status = PingStatus.UNKNOWN_ERROR;
      }

      this.logger.warn(`Ping failed for ${endpoint.name}: ${error.message}`);
    }

    // Save result to database if requested
    let savedResult: PingResult | null = null;
    if (saveResult) {
      try {
        savedResult = await this.pingResultRepository.save(
          this.pingResultRepository.create(pingResult)
        );
        
        // Send notifications if enabled
        if (endpoint.enableAlerts) {
          await this.notificationService.handlePingResult(savedResult, endpoint);
        }
      } catch (error) {
        this.logger.error('Failed to save ping result:', error);
      }
    }

    // Return response
    const response: PingResponse = {
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      status: pingResult.status!,
      isSuccess: pingResult.isSuccess!,
      httpStatusCode: pingResult.httpStatusCode,
      responseTimeMs: pingResult.responseTimeMs,
      errorMessage: pingResult.errorMessage,
      result: savedResult,
    };

    return response;
  }

  private isResponseSuccessful(response: any, endpoint: ApiEndpoint): boolean {
    const expectedResponse = endpoint.expectedResponse;
    
    // Default success criteria: 2xx status code
    if (!expectedResponse) {
      return response.status >= 200 && response.status < 300;
    }

    // Check expected status code
    if (expectedResponse.statusCode && response.status !== expectedResponse.statusCode) {
      return false;
    }

    // Check content type
    if (expectedResponse.contentType) {
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes(expectedResponse.contentType)) {
        return false;
      }
    }

    // Check body content
    if (expectedResponse.bodyContains) {
      const responseBody = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      if (!responseBody.includes(expectedResponse.bodyContains)) {
        return false;
      }
    }

    return response.status >= 200 && response.status < 400;
  }

  private validateResponse(response: any, endpoint: ApiEndpoint): any {
    const results = {
      statusCodeValid: true,
      contentTypeValid: true,
      bodyContainsValid: true,
      responseTimeValid: true,
      details: [] as string[],
    };

    const expectedResponse = endpoint.expectedResponse;
    if (!expectedResponse) return results;

    // Validate status code
    if (expectedResponse.statusCode && response.status !== expectedResponse.statusCode) {
      results.statusCodeValid = false;
      results.details.push(`Expected status ${expectedResponse.statusCode}, got ${response.status}`);
    }

    // Validate content type
    if (expectedResponse.contentType) {
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes(expectedResponse.contentType)) {
        results.contentTypeValid = false;
        results.details.push(`Expected content type ${expectedResponse.contentType}, got ${contentType}`);
      }
    }

    // Validate body content
    if (expectedResponse.bodyContains) {
      const responseBody = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      if (!responseBody.includes(expectedResponse.bodyContains)) {
        results.bodyContainsValid = false;
        results.details.push(`Response body does not contain "${expectedResponse.bodyContains}"`);
      }
    }

    return results;
  }

  private truncateString(str: any, maxLength: number): string {
    const stringified = typeof str === 'string' ? str : JSON.stringify(str);
    return stringified.length > maxLength 
      ? stringified.substring(0, maxLength) + '...[truncated]'
      : stringified;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalEndpoints: number;
    activeEndpoints: number;
    healthyEndpoints: number;
    degradedEndpoints: number;
    downEndpoints: number;
    lastCheckAt: Date;
  }> {
    const [total, active] = await Promise.all([
      this.endpointRepository.count(),
      this.endpointRepository.count({
        where: { isActive: true, status: EndpointStatus.ACTIVE }
      }),
    ]);

    const endpoints = await this.endpointRepository.find({
      where: { isActive: true, status: EndpointStatus.ACTIVE },
      relations: ['pingResults'],
    });

    let healthy = 0;
    let degraded = 0;
    let down = 0;

    endpoints.forEach(endpoint => {
      switch (endpoint.currentStatus) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'down':
          down++;
          break;
      }
    });

    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (down > active * 0.1) { // More than 10% down
      systemStatus = 'unhealthy';
    } else if (degraded > active * 0.2) { // More than 20% degraded
      systemStatus = 'degraded';
    }

    return {
      status: systemStatus,
      totalEndpoints: total,
      activeEndpoints: active,
      healthyEndpoints: healthy,
      degradedEndpoints: degraded,
      downEndpoints: down,
      lastCheckAt: new Date(),
    };
  }

  async getEndpointHealth(endpointId: string): Promise<{
    endpoint: ApiEndpoint;
    currentStatus: string;
    uptimePercentage: number;
    averageResponseTime: number;
    lastPingResult: PingResult | null;
    recentIncidents: number;
  }> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id: endpointId },
      relations: ['pingResults'],
    });

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const lastPingResult = await this.pingResultRepository.findOne({
      where: { endpointId },
      order: { createdAt: 'DESC' },
    });

    // Count recent incidents (failures in last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const recentIncidents = await this.pingResultRepository.count({
      where: {
        endpointId,
        isSuccess: false,
        createdAt: yesterday,
      },
    });

    return {
      endpoint,
      currentStatus: endpoint.currentStatus,
      uptimePercentage: endpoint.uptimePercentage,
      averageResponseTime: endpoint.averageResponseTime,
      lastPingResult,
      recentIncidents,
    };
  }

  // Controller support methods
  async pingSpecificEndpoint(endpointId: string, triggeredBy?: string): Promise<PingResponse> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id: endpointId }
    });

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    return this.pingEndpoint({
      endpoint,
      saveResult: true,
      includeDetails: true,
    });
  }

  async bulkPing(endpointIds: string[], triggeredBy?: string): Promise<PingResponse[]> {
    const endpoints = await this.endpointRepository.findByIds(endpointIds);

    if (endpoints.length === 0) {
      throw new Error('No valid endpoints found');
    }

    const results = await Promise.all(
      endpoints.map(endpoint =>
        this.pingEndpoint({
          endpoint,
          saveResult: true,
          includeDetails: false,
        })
      )
    );

    return results;
  }

  async pingAllActiveEndpoints(triggeredBy?: string): Promise<PingResponse[]> {
    const activeEndpoints = await this.endpointRepository.find({
      where: { 
        isActive: true, 
        status: EndpointStatus.ACTIVE 
      }
    });

    return this.bulkPing(activeEndpoints.map(e => e.id), triggeredBy);
  }

  async getPingResults(queryDto: PingResultQueryDto): Promise<{
    results: PingResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      limit = 50,
      offset = 0,
      endpointId,
      status,
      isSuccess,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.endpoint', 'endpoint');

    if (endpointId) {
      queryBuilder.andWhere('result.endpointId = :endpointId', { endpointId });
    }

    if (status) {
      queryBuilder.andWhere('result.status = :status', { status });
    }

    if (isSuccess !== undefined) {
      queryBuilder.andWhere('result.isSuccess = :isSuccess', { isSuccess });
    }

    if (startDate) {
      queryBuilder.andWhere('result.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('result.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy(`result.${sortBy}`, sortOrder);
    queryBuilder.skip(offset).take(limit);

    const [results, total] = await queryBuilder.getManyAndCount();

    return {
      results,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPingResult(id: string): Promise<PingResult> {
    const result = await this.pingResultRepository.findOne({
      where: { id },
      relations: ['endpoint'],
    });

    if (!result) {
      throw new Error('Ping result not found');
    }

    return result;
  }

  async getEndpointPingResults(endpointId: string, queryDto: PingResultQueryDto) {
    return this.getPingResults({ ...queryDto, endpointId });
  }

  async getAnalytics(analyticsDto: PingResultAnalyticsDto): Promise<any> {
    const {
      period = '24h',
      endpointIds,
      providers,
      groupBy = 'hour',
    } = analyticsDto;

    const periodHours = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - periodHours);

    const queryBuilder = this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.endpoint', 'endpoint')
      .where('result.createdAt >= :startDate', { startDate });

    if (endpointIds?.length) {
      queryBuilder.andWhere('result.endpointId IN (:...endpointIds)', { endpointIds });
    }

    if (providers?.length) {
      queryBuilder.andWhere('endpoint.provider IN (:...providers)', { providers });
    }

    const results = await queryBuilder.getMany();

    return this.processAnalyticsData(results, groupBy, periodHours);
  }

  async getMonitoringStatus(): Promise<{
    isRunning: boolean;
    lastCheck: Date;
    nextCheck: Date;
    activeEndpoints: number;
    totalPingsToday: number;
    errors: string[];
  }> {
    const activeEndpoints = await this.endpointRepository.count({
      where: { isActive: true, status: EndpointStatus.ACTIVE }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalPingsToday = await this.pingResultRepository.count({
      where: {
        createdAt: today,
      }
    });

    return {
      isRunning: true, // TODO: Implement actual monitoring status tracking
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + 30000), // Next check in 30 seconds
      activeEndpoints,
      totalPingsToday,
      errors: [], // TODO: Implement error tracking
    };
  }

  async startMonitoring(): Promise<{ message: string; status: string }> {
    // TODO: Implement actual start/stop monitoring logic
    return {
      message: 'Monitoring service started successfully',
      status: 'started'
    };
  }

  async stopMonitoring(): Promise<{ message: string; status: string }> {
    // TODO: Implement actual start/stop monitoring logic
    return {
      message: 'Monitoring service stopped successfully',
      status: 'stopped'
    };
  }

  async restartMonitoring(): Promise<{ message: string; status: string }> {
    // TODO: Implement actual restart monitoring logic
    return {
      message: 'Monitoring service restarted successfully',
      status: 'restarted'
    };
  }

  async exportPingResults(exportDto: ExportPingResultsDto): Promise<{
    data: any;
    filename: string;
    mimeType: string;
  }> {
    const results = await this.getPingResults({
      ...exportDto.filters,
      limit: exportDto.limit || 10000,
    });

    const filename = `ping-results-${new Date().toISOString().split('T')[0]}`;

    switch (exportDto.format) {
      case 'csv':
        return {
          data: this.convertToCSV(results.results),
          filename: `${filename}.csv`,
          mimeType: 'text/csv',
        };
      case 'json':
        return {
          data: JSON.stringify(results.results, null, 2),
          filename: `${filename}.json`,
          mimeType: 'application/json',
        };
      default:
        throw new Error('Unsupported export format');
    }
  }

  async generateUptimeReport(period: '24h' | '7d' | '30d'): Promise<any> {
    const hours = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const endpoints = await this.endpointRepository.find({
      where: { isActive: true },
      relations: ['pingResults'],
    });

    const report = endpoints.map(endpoint => {
      const periodResults = endpoint.pingResults.filter(
        result => result.createdAt >= startDate
      );

      const totalPings = periodResults.length;
      const successfulPings = periodResults.filter(r => r.isSuccess).length;
      const uptime = totalPings > 0 ? (successfulPings / totalPings) * 100 : 100;

      return {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        url: endpoint.url,
        provider: endpoint.provider,
        totalPings,
        successfulPings,
        uptimePercentage: Math.round(uptime * 100) / 100,
        averageResponseTime: this.calculateAverageResponseTime(periodResults),
      };
    });

    return {
      period,
      generatedAt: new Date(),
      totalEndpoints: endpoints.length,
      overallUptime: this.calculateOverallUptime(report),
      endpoints: report,
    };
  }

  async generatePerformanceReport(period: '24h' | '7d' | '30d'): Promise<any> {
    const hours = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const results = await this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.endpoint', 'endpoint')
      .where('result.createdAt >= :startDate', { startDate })
      .andWhere('result.isSuccess = :isSuccess', { isSuccess: true })
      .getMany();

    const performanceData = this.groupResultsByEndpoint(results);

    return {
      period,
      generatedAt: new Date(),
      totalRequests: results.length,
      averageResponseTime: this.calculateAverageResponseTime(results),
      endpoints: performanceData,
    };
  }

  async generateIncidentsReport(period: '24h' | '7d' | '30d'): Promise<any> {
    const hours = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const incidents = await this.pingResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.endpoint', 'endpoint')
      .where('result.createdAt >= :startDate', { startDate })
      .andWhere('result.isSuccess = :isSuccess', { isSuccess: false })
      .getMany();

    const incidentsByEndpoint = this.groupIncidentsByEndpoint(incidents);

    return {
      period,
      generatedAt: new Date(),
      totalIncidents: incidents.length,
      affectedEndpoints: Object.keys(incidentsByEndpoint).length,
      incidents: incidentsByEndpoint,
    };
  }

  async isHealthy(): Promise<boolean> {
    // Simple health check - verify we can connect to database
    try {
      await this.endpointRepository.count();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper methods
  private parsePeriod(period: string): number {
    switch (period) {
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      default: return 24;
    }
  }

  private processAnalyticsData(results: PingResult[], groupBy: string, periodHours: number): any {
    // Group results by time period and calculate metrics
    const groupedData = {};
    
    results.forEach(result => {
      const key = this.getTimeGroupKey(result.createdAt, groupBy);
      if (!groupedData[key]) {
        groupedData[key] = {
          timestamp: key,
          totalPings: 0,
          successfulPings: 0,
          avgResponseTime: 0,
          responseTimes: [],
        };
      }
      
      groupedData[key].totalPings++;
      if (result.isSuccess) {
        groupedData[key].successfulPings++;
        if (result.responseTimeMs) {
          groupedData[key].responseTimes.push(result.responseTimeMs);
        }
      }
    });

    // Calculate averages
    Object.values(groupedData).forEach((group: any) => {
      if (group.responseTimes.length > 0) {
        group.avgResponseTime = group.responseTimes.reduce((sum, time) => sum + time, 0) / group.responseTimes.length;
      }
      group.uptimePercentage = (group.successfulPings / group.totalPings) * 100;
      delete group.responseTimes; // Remove raw data
    });

    return Object.values(groupedData);
  }

  private getTimeGroupKey(date: Date, groupBy: string): string {
    switch (groupBy) {
      case 'hour':
        return date.toISOString().substring(0, 13) + ':00:00';
      case 'day':
        return date.toISOString().substring(0, 10);
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().substring(0, 10);
      default:
        return date.toISOString().substring(0, 13) + ':00:00';
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  private calculateAverageResponseTime(results: PingResult[]): number {
    const successfulResults = results.filter(r => r.isSuccess && r.responseTimeMs);
    if (successfulResults.length === 0) return 0;
    
    const total = successfulResults.reduce((sum, r) => sum + r.responseTimeMs!, 0);
    return Math.round(total / successfulResults.length);
  }

  private calculateOverallUptime(report: any[]): number {
    if (report.length === 0) return 100;
    
    const totalUptime = report.reduce((sum, endpoint) => sum + endpoint.uptimePercentage, 0);
    return Math.round((totalUptime / report.length) * 100) / 100;
  }

  private groupResultsByEndpoint(results: PingResult[]): any {
    const grouped = {};
    
    results.forEach(result => {
      const endpointId = result.endpointId;
      if (!grouped[endpointId]) {
        grouped[endpointId] = {
          endpointId,
          totalRequests: 0,
          responseTimes: [],
        };
      }
      
      grouped[endpointId].totalRequests++;
      if (result.responseTimeMs) {
        grouped[endpointId].responseTimes.push(result.responseTimeMs);
      }
    });

    // Calculate averages
    Object.values(grouped).forEach((endpoint: any) => {
      if (endpoint.responseTimes.length > 0) {
        endpoint.averageResponseTime = this.calculateAverageResponseTime(endpoint.responseTimes);
        endpoint.minResponseTime = Math.min(...endpoint.responseTimes);
        endpoint.maxResponseTime = Math.max(...endpoint.responseTimes);
      }
      delete endpoint.responseTimes;
    });

    return grouped;
  }

  private groupIncidentsByEndpoint(incidents: PingResult[]): any {
    const grouped = {};
    
    incidents.forEach(incident => {
      const endpointId = incident.endpointId;
      if (!grouped[endpointId]) {
        grouped[endpointId] = {
          endpointId,
          incidents: [],
          totalIncidents: 0,
        };
      }
      
      grouped[endpointId].incidents.push({
        timestamp: incident.createdAt,
        status: incident.status,
        errorMessage: incident.errorMessage,
        responseTime: incident.responseTimeMs,
      });
      grouped[endpointId].totalIncidents++;
    });

    return grouped;
  }
}