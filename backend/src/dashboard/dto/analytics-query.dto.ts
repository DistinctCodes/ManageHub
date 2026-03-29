import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics period (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics period (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  to?: string;
}
