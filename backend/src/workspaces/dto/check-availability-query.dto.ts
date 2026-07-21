import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckAvailabilityQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Number of seats needed' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description: 'Start of the date range to check. Defaults to today.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description:
      'End of the date range to check. Defaults to startDate (a single day).',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
