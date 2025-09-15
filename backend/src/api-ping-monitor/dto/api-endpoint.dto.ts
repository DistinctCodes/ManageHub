import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsUrl,
  Min,
  Max,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HttpMethod,
  ApiProvider,
  EndpointStatus,
} from '../entities/api-endpoint.entity';

export class CreateApiEndpointDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsUrl()
  @Length(1, 2048)
  url: string;

  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod;

  @IsEnum(ApiProvider)
  @IsOptional()
  provider?: ApiProvider;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsString()
  @IsOptional()
  body?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(3600)
  intervalSeconds?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  retryAttempts?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(10000)
  retryDelayMs?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpectedResponseDto)
  expectedResponse?: ExpectedResponseDto;

  @IsEnum(EndpointStatus)
  @IsOptional()
  status?: EndpointStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAlerts?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertConfigDto)
  alertConfig?: AlertConfigDto;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  tags?: string;

  @IsString()
  createdBy: string;
}

export class UpdateApiEndpointDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsUrl()
  @IsOptional()
  @Length(1, 2048)
  url?: string;

  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod;

  @IsEnum(ApiProvider)
  @IsOptional()
  provider?: ApiProvider;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsString()
  @IsOptional()
  body?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(3600)
  intervalSeconds?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  retryAttempts?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(10000)
  retryDelayMs?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpectedResponseDto)
  expectedResponse?: ExpectedResponseDto;

  @IsEnum(EndpointStatus)
  @IsOptional()
  status?: EndpointStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAlerts?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertConfigDto)
  alertConfig?: AlertConfigDto;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  tags?: string;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}

export class ExpectedResponseDto {
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @IsString()
  @IsOptional()
  contentType?: string;

  @IsString()
  @IsOptional()
  bodyContains?: string;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(30000)
  maxResponseTimeMs?: number;
}

export class AlertConfigDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  consecutiveFailures?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(30000)
  responseTimeThresholdMs?: number;

  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(100)
  uptimeThreshold?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  emailNotifications?: string[];

  @IsString()
  @IsOptional()
  slackWebhook?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  notifyOnRecovery?: boolean;
}

export class ApiEndpointQueryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ApiProvider)
  @IsOptional()
  provider?: ApiProvider;

  @IsEnum(EndpointStatus)
  @IsOptional()
  status?: EndpointStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

export class BulkUpdateEndpointsDto {
  @IsArray()
  @IsString({ each: true })
  endpointIds: string[];

  @IsEnum(EndpointStatus)
  @IsOptional()
  status?: EndpointStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAlerts?: boolean;

  @IsString()
  updatedBy: string;
}
