import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ApiKey, ApiKeyStatus } from './api-key.entity';
import { ApiKeyUsage } from './api-key-usage.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import {
  CreateApiKeyResponseDto,
  ApiKeyResponseDto,
} from './dto/api-key-response.dto';
import { UsageStatsDto } from './dto/usage-stats.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(ApiKeyUsage)
    private readonly usageRepository: Repository<ApiKeyUsage>,
  ) {}

  async createApiKey(
    createDto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    // Check if app name already exists
    const existingKey = await this.apiKeyRepository.findOne({
      where: { appName: createDto.appName },
    });

    if (existingKey) {
      throw new ConflictException('App name already registered');
    }

    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Create entity
    const newApiKey = this.apiKeyRepository.create({
      ...createDto,
      keyHash,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    });

    const savedKey = await this.apiKeyRepository.save(newApiKey);

    return {
      ...this.mapToResponseDto(savedKey),
      apiKey, // Only returned on creation
    };
  }

  async findAll(): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });
    return keys.map((key) => this.mapToResponseDto(key));
  }

  async findOne(id: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    return this.mapToResponseDto(apiKey);
  }

  async update(
    id: string,
    updateDto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updateData = {
      ...updateDto,
      expiresAt: updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : apiKey.expiresAt,
    };

    await this.apiKeyRepository.update(id, updateData);
    const updatedKey = await this.apiKeyRepository.findOne({ where: { id } });
    return this.mapToResponseDto(updatedKey);
  }

  async revokeApiKey(id: string): Promise<void> {
    const result = await this.apiKeyRepository.update(id, {
      status: ApiKeyStatus.REVOKED,
    });

    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const keys = await this.apiKeyRepository.find({
      where: { status: ApiKeyStatus.ACTIVE },
    });

    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        // Check if expired
        if (key.expiresAt && new Date() > key.expiresAt) {
          await this.apiKeyRepository.update(key.id, {
            status: ApiKeyStatus.EXPIRED,
          });
          return null;
        }
        return key;
      }
    }
    return null;
  }

  async trackUsage(
    apiKey: ApiKey,
    endpoint: string,
    method: string,
    statusCode: number,
    userAgent?: string,
    ipAddress?: string,
    responseTime?: number,
  ): Promise<void> {
    // Reset daily usage if it's a new day
    const today = new Date().toDateString();
    const lastUsage = apiKey.lastUsageDate?.toDateString();

    if (lastUsage !== today) {
      apiKey.currentDayUsage = 0;
    }

    // Check daily limit
    if (apiKey.currentDayUsage >= apiKey.dailyLimit) {
      throw new BadRequestException('Daily API limit exceeded');
    }

    // Update usage counters
    apiKey.currentDayUsage += 1;
    apiKey.totalUsage += 1;
    apiKey.lastUsageDate = new Date();

    await this.apiKeyRepository.save(apiKey);

    // Log usage
    const usage = this.usageRepository.create({
      apiKeyId: apiKey.id,
      endpoint,
      method,
      statusCode,
      userAgent,
      ipAddress,
      responseTime,
    });

    await this.usageRepository.save(usage);
  }

  async getUsageStats(id: string, days: number = 30): Promise<UsageStatsDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await this.usageRepository.find({
      where: {
        apiKeyId: id,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    // Calculate stats
    const totalRequests = usage.length;
    const todayRequests = apiKey.currentDayUsage;
    const remainingToday = Math.max(0, apiKey.dailyLimit - todayRequests);

    const avgResponseTime = usage
      .filter((u) => u.responseTime)
      .reduce((acc, u, _, arr) => acc + u.responseTime / arr.length, 0);

    // Top endpoints
    const endpointCounts = usage.reduce((acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
      return acc;
    }, {});

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily usage
    const dailyUsage = usage.reduce((acc, u) => {
      const date = u.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const dailyUsageArray = Object.entries(dailyUsage)
      .map(([date, count]) => ({ date, count: count as number }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests,
      todayRequests,
      dailyLimit: apiKey.dailyLimit,
      remainingToday,
      averageResponseTime: Math.round(avgResponseTime),
      topEndpoints,
      dailyUsage: dailyUsageArray,
    };
  }

  private generateApiKey(): string {
    return `ak_${crypto.randomBytes(32).toString('hex')}`;
  }

  private mapToResponseDto(apiKey: ApiKey): ApiKeyResponseDto {
    const { keyHash, ...response } = apiKey;
    return response as ApiKeyResponseDto;
  }
}
