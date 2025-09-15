import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { PingStatus } from '../entities/ping-result.entity';

export class PingResultQueryDto {
  @IsUUID()
  @IsOptional()
  endpointId?: string;

  @IsEnum(PingStatus)
  @IsOptional()
  status?: PingStatus;

  @IsBoolean()
  @IsOptional()
  isSuccess?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minResponseTime?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxResponseTime?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(599)
  httpStatusCode?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

export class ManualPingDto {
  @IsUUID()
  endpointId: string;

  @IsBoolean()
  @IsOptional()
  saveResult?: boolean;

  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean;
}

export class BulkPingDto {
  @IsUUID('4', { each: true })
  endpointIds: string[];

  @IsBoolean()
  @IsOptional()
  saveResults?: boolean;

  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean;
}

export class PingAnalyticsQueryDto {
  @IsUUID()
  @IsOptional()
  endpointId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  @IsOptional()
  groupBy?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean;
}

export class UptimeReportDto {
  @IsUUID()
  @IsOptional()
  endpointId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  period?: 'daily' | 'weekly' | 'monthly';

  @IsBoolean()
  @IsOptional()
  includeIncidents?: boolean;
}

export class PerformanceReportDto {
  @IsUUID()
  @IsOptional()
  endpointId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['p50', 'p95', 'p99', 'avg', 'min', 'max'])
  @IsOptional()
  metric?: 'p50' | 'p95' | 'p99' | 'avg' | 'min' | 'max';

  @IsBoolean()
  @IsOptional()
  includeTrends?: boolean;
}

export class ExportReportDto {
  @IsUUID()
  @IsOptional()
  endpointId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['csv', 'json', 'xlsx'])
  @IsOptional()
  format?: 'csv' | 'json' | 'xlsx';

  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean;

  @IsBoolean()
  @IsOptional()
  includeMetrics?: boolean;
}