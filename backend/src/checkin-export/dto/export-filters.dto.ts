import {
    IsOptional,
    IsDateString,
    IsString,
    IsArray,
    IsEnum,
    IsInt,
    Min,
    Max,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  
  export enum ExportFormat {
    CSV = 'csv',
    JSON = 'json',
  }
  
  export enum HealthStatusFilter {
    GOOD = 'Good',
    FAIR = 'Fair',
    POOR = 'Poor',
    CRITICAL = 'Critical',
  }
  
  export class ExportFiltersDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;
  
    @IsOptional()
    @IsDateString()
    endDate?: string;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => 
      typeof value === 'string' ? value.split(',') : value
    )
    userIds?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => 
      typeof value === 'string' ? value.split(',') : value
    )
    departments?: string[];
  
    @IsOptional()
    @IsEnum(ExportFormat)
    format?: ExportFormat = ExportFormat.CSV;
  
    @IsOptional()
    @IsArray()
    @IsEnum(HealthStatusFilter, { each: true })
    @Transform(({ value }) => 
      typeof value === 'string' ? value.split(',') : value
    )
    healthStatus?: HealthStatusFilter[];
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(50)
    @Max(200)
    minHeartRate?: number;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(50)
    @Max(200)
    maxHeartRate?: number;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10)
    maxStressLevel?: number;
  
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    includePersonalData?: boolean = true;
  }