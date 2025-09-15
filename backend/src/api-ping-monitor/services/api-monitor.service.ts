import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosResponse, AxiosError } from 'axios';
import * as https from 'https';
import * as http from 'http';
import { ApiEndpoint, EndpointStatus } from '../entities/api-endpoint.entity';
import { PingResult, PingStatus } from '../entities/ping-result.entity';
import { ManualPingDto, BulkPingDto } from '../dto/ping-result.dto';

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
      const response: AxiosResponse = await axios(axiosConfig);
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

  private isResponseSuccessful(response: AxiosResponse, endpoint: ApiEndpoint): boolean {
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

  private validateResponse(response: AxiosResponse, endpoint: ApiEndpoint): any {
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
}