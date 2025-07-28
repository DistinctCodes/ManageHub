import { IsOptional, IsArray, IsString, IsNumber, Min, Max, IsDateString, IsEnum } from 'class-validator';
import { ApiKeyStatus } from '../api-key.entity';

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEndpoints?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  dailyLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;
}
