import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { ApiEndpoint, EndpointStatus } from '../entities/api-endpoint.entity';
import { PingResult } from '../entities/ping-result.entity';
import {
  CreateApiEndpointDto,
  UpdateApiEndpointDto,
  ApiEndpointQueryDto,
  BulkUpdateEndpointsDto,
} from '../dto/api-endpoint.dto';

export interface PaginatedEndpoints {
  endpoints: ApiEndpoint[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ApiEndpointService {
  private readonly logger = new Logger(ApiEndpointService.name);

  constructor(
    @InjectRepository(ApiEndpoint)
    private endpointRepository: Repository<ApiEndpoint>,
    @InjectRepository(PingResult)
    private pingResultRepository: Repository<PingResult>,
  ) {}

  async create(createEndpointDto: CreateApiEndpointDto): Promise<ApiEndpoint> {
    // Check if endpoint with same URL already exists
    const existingEndpoint = await this.endpointRepository.findOne({
      where: { url: createEndpointDto.url },
    });

    if (existingEndpoint) {
      throw new BadRequestException(
        `Endpoint with URL ${createEndpointDto.url} already exists`,
      );
    }

    // Validate URL by attempting to parse it
    try {
      new URL(createEndpointDto.url);
    } catch (error) {
      throw new BadRequestException('Invalid URL format');
    }

    const endpoint = this.endpointRepository.create({
      ...createEndpointDto,
      nextPingAt: new Date(), // Start monitoring immediately
    });

    const savedEndpoint = await this.endpointRepository.save(endpoint);

    this.logger.log(
      `Created new API endpoint: ${savedEndpoint.name} (${savedEndpoint.url})`,
    );

    return savedEndpoint;
  }

  async findAll(queryDto: ApiEndpointQueryDto): Promise<PaginatedEndpoints> {
    const {
      limit = 10,
      offset = 0,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = queryDto;

    const queryBuilder = this.endpointRepository
      .createQueryBuilder('endpoint')
      .leftJoinAndSelect('endpoint.pingResults', 'pingResults');

    // Apply filters
    if (filters.name) {
      queryBuilder.andWhere('endpoint.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    if (filters.provider) {
      queryBuilder.andWhere('endpoint.provider = :provider', {
        provider: filters.provider,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('endpoint.status = :status', {
        status: filters.status,
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('endpoint.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.tags) {
      queryBuilder.andWhere('endpoint.tags ILIKE :tags', {
        tags: `%${filters.tags}%`,
      });
    }

    if (filters.createdBy) {
      queryBuilder.andWhere('endpoint.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(endpoint.name ILIKE :search OR endpoint.description ILIKE :search OR endpoint.url ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`endpoint.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [endpoints, total] = await queryBuilder.getManyAndCount();

    return {
      endpoints,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ApiEndpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id },
      relations: ['pingResults'],
    });

    if (!endpoint) {
      throw new NotFoundException(`API endpoint with ID ${id} not found`);
    }

    return endpoint;
  }

  async update(
    id: string,
    updateEndpointDto: UpdateApiEndpointDto,
  ): Promise<ApiEndpoint> {
    const endpoint = await this.findOne(id);

    // If URL is being updated, check for conflicts
    if (updateEndpointDto.url && updateEndpointDto.url !== endpoint.url) {
      const existingEndpoint = await this.endpointRepository.findOne({
        where: { url: updateEndpointDto.url },
      });

      if (existingEndpoint && existingEndpoint.id !== id) {
        throw new BadRequestException(
          `Endpoint with URL ${updateEndpointDto.url} already exists`,
        );
      }

      // Validate new URL
      try {
        new URL(updateEndpointDto.url);
      } catch (error) {
        throw new BadRequestException('Invalid URL format');
      }
    }

    // If interval is being updated, recalculate next ping time
    if (
      updateEndpointDto.intervalSeconds &&
      updateEndpointDto.intervalSeconds !== endpoint.intervalSeconds
    ) {
      endpoint.nextPingAt = new Date(
        Date.now() + updateEndpointDto.intervalSeconds * 1000,
      );
    }

    Object.assign(endpoint, updateEndpointDto);

    const updatedEndpoint = await this.endpointRepository.save(endpoint);

    this.logger.log(`Updated API endpoint: ${updatedEndpoint.name}`);

    return updatedEndpoint;
  }

  async remove(id: string): Promise<void> {
    const endpoint = await this.findOne(id);

    await this.endpointRepository.remove(endpoint);

    this.logger.log(`Deleted API endpoint: ${endpoint.name}`);
  }

  async bulkUpdate(bulkUpdateDto: BulkUpdateEndpointsDto): Promise<{
    updated: number;
    errors: string[];
  }> {
    const { endpointIds, updatedBy, ...updateData } = bulkUpdateDto;

    const errors: string[] = [];
    let updated = 0;

    for (const endpointId of endpointIds) {
      try {
        await this.update(endpointId, { ...updateData, updatedBy });
        updated++;
      } catch (error) {
        errors.push(
          `Failed to update endpoint ${endpointId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk update completed: ${updated} successful, ${errors.length} errors`,
    );

    return { updated, errors };
  }

  async toggleStatus(id: string, status: EndpointStatus): Promise<ApiEndpoint> {
    const endpoint = await this.findOne(id);

    endpoint.status = status;
    if (status === EndpointStatus.ACTIVE) {
      endpoint.nextPingAt = new Date(); // Resume monitoring immediately
    }

    const updatedEndpoint = await this.endpointRepository.save(endpoint);

    this.logger.log(`Changed status of ${endpoint.name} to ${status}`);

    return updatedEndpoint;
  }

  async toggleActive(id: string, isActive: boolean): Promise<ApiEndpoint> {
    const endpoint = await this.findOne(id);

    endpoint.isActive = isActive;
    if (isActive && endpoint.status === EndpointStatus.ACTIVE) {
      endpoint.nextPingAt = new Date(); // Resume monitoring immediately
    }

    const updatedEndpoint = await this.endpointRepository.save(endpoint);

    this.logger.log(
      `${isActive ? 'Activated' : 'Deactivated'} endpoint: ${endpoint.name}`,
    );

    return updatedEndpoint;
  }

  async getEndpointsByProvider(provider: string): Promise<ApiEndpoint[]> {
    return this.endpointRepository.find({
      where: { provider: provider as any },
      relations: ['pingResults'],
      order: { name: 'ASC' },
    });
  }

  async getActiveEndpoints(): Promise<ApiEndpoint[]> {
    return this.endpointRepository.find({
      where: {
        isActive: true,
        status: EndpointStatus.ACTIVE,
      },
      relations: ['pingResults'],
      order: { name: 'ASC' },
    });
  }

  async getHealthyEndpoints(): Promise<ApiEndpoint[]> {
    const endpoints = await this.getActiveEndpoints();
    return endpoints.filter((endpoint) => endpoint.isHealthy);
  }

  async getUnhealthyEndpoints(): Promise<ApiEndpoint[]> {
    const endpoints = await this.getActiveEndpoints();
    return endpoints.filter((endpoint) => !endpoint.isHealthy);
  }

  async getEndpointStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    healthy: number;
    degraded: number;
    down: number;
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
    averageUptime: number;
    averageResponseTime: number;
  }> {
    const [total, active, inactive] = await Promise.all([
      this.endpointRepository.count(),
      this.endpointRepository.count({ where: { isActive: true } }),
      this.endpointRepository.count({ where: { isActive: false } }),
    ]);

    const endpoints = await this.endpointRepository.find({
      relations: ['pingResults'],
    });

    let healthy = 0;
    let degraded = 0;
    let down = 0;
    const byProvider: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalUptime = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    endpoints.forEach((endpoint) => {
      // Count by current status
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

      // Count by provider
      byProvider[endpoint.provider] = (byProvider[endpoint.provider] || 0) + 1;

      // Count by status
      byStatus[endpoint.status] = (byStatus[endpoint.status] || 0) + 1;

      // Calculate averages
      totalUptime += endpoint.uptimePercentage;

      if (endpoint.averageResponseTime > 0) {
        totalResponseTime += endpoint.averageResponseTime;
        responseTimeCount++;
      }
    });

    return {
      total,
      active,
      inactive,
      healthy,
      degraded,
      down,
      byProvider,
      byStatus,
      averageUptime: endpoints.length > 0 ? totalUptime / endpoints.length : 0,
      averageResponseTime:
        responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
    };
  }

  async getEndpointHistory(
    id: string,
    days: number = 7,
  ): Promise<{
    endpoint: ApiEndpoint;
    history: Array<{
      date: string;
      uptimePercentage: number;
      averageResponseTime: number;
      totalPings: number;
      successfulPings: number;
      incidents: number;
    }>;
  }> {
    const endpoint = await this.findOne(id);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get ping results for the specified period
    const pingResults = await this.pingResultRepository
      .createQueryBuilder('ping')
      .where('ping.endpointId = :endpointId', { endpointId: id })
      .andWhere('ping.createdAt >= :startDate', { startDate })
      .andWhere('ping.createdAt <= :endDate', { endDate })
      .orderBy('ping.createdAt', 'ASC')
      .getMany();

    // Group results by day
    const history: Array<{
      date: string;
      uptimePercentage: number;
      averageResponseTime: number;
      totalPings: number;
      successfulPings: number;
      incidents: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayResults = pingResults.filter((result) => {
        const resultDate = result.createdAt.toISOString().split('T')[0];
        return resultDate === dateStr;
      });

      const totalPings = dayResults.length;
      const successfulPings = dayResults.filter((r) => r.isSuccess).length;
      const uptimePercentage =
        totalPings > 0 ? (successfulPings / totalPings) * 100 : 100;

      const responseTimes = dayResults
        .filter((r) => r.isSuccess && r.responseTimeMs)
        .map((r) => r.responseTimeMs!);

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      const incidents = dayResults.filter((r) => !r.isSuccess).length;

      history.push({
        date: dateStr,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        totalPings,
        successfulPings,
        incidents,
      });
    }

    return { endpoint, history };
  }

  async createPresetEndpoints(
    provider: string,
    createdBy: string,
  ): Promise<ApiEndpoint[]> {
    const presets = this.getProviderPresets(provider);
    const createdEndpoints: ApiEndpoint[] = [];

    for (const preset of presets) {
      try {
        const endpoint = await this.create({
          ...preset,
          createdBy,
        });
        createdEndpoints.push(endpoint);
      } catch (error) {
        this.logger.warn(
          `Failed to create preset endpoint ${preset.name}: ${error.message}`,
        );
      }
    }

    return createdEndpoints;
  }

  private getProviderPresets(provider: string): CreateApiEndpointDto[] {
    const presets: Record<string, CreateApiEndpointDto[]> = {
      stripe: [
        {
          name: 'Stripe API Status',
          description: 'Stripe API health status endpoint',
          url: 'https://status.stripe.com/api/status.json',
          method: 'GET' as any,
          provider: 'stripe' as any,
          intervalSeconds: 300,
          expectedResponse: {
            statusCode: 200,
            contentType: 'application/json',
          },
          createdBy: '',
        },
      ],
      google: [
        {
          name: 'Google APIs Status',
          description: 'Google APIs service status',
          url: 'https://www.google.com/ping',
          method: 'GET' as any,
          provider: 'google' as any,
          intervalSeconds: 300,
          expectedResponse: {
            statusCode: 200,
          },
          createdBy: '',
        },
      ],
      github: [
        {
          name: 'GitHub API Status',
          description: 'GitHub API health endpoint',
          url: 'https://api.github.com/zen',
          method: 'GET' as any,
          provider: 'github' as any,
          intervalSeconds: 300,
          expectedResponse: {
            statusCode: 200,
          },
          createdBy: '',
        },
      ],
    };

    return presets[provider.toLowerCase()] || [];
  }
}
