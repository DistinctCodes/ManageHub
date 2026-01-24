import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AggregationPeriod } from '../types/analytics.types';

export class AnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for analytics period',
    example: '2026-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for analytics period',
    example: '2026-01-31',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Aggregation period for data grouping',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'daily',
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  aggregation?: AggregationPeriod = 'daily';

  @ApiPropertyOptional({
    description: 'Optional location/workspace ID for filtering',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Optional staff ID for filtering',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Compare with previous period',
    default: true,
  })
  @IsOptional()
  comparePrevious?: boolean = true;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Optional location/workspace ID for filtering',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
