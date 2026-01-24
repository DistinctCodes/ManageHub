import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat, ReportType } from '../types/analytics.types';

export class ExportReportDto {
  @ApiProperty({
    description: 'Type of report to export',
    enum: ['dashboard', 'attendance', 'revenue', 'members', 'occupancy'],
  })
  @IsEnum(['dashboard', 'attendance', 'revenue', 'members', 'occupancy'])
  reportType: ReportType;

  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'excel', 'pdf'],
  })
  @IsEnum(['csv', 'excel', 'pdf'])
  format: ExportFormat;

  @ApiProperty({
    description: 'Start date for report period',
    example: '2026-01-01',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: 'End date for report period',
    example: '2026-01-31',
  })
  @IsString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Optional title for the report',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional columns to include (for CSV/Excel)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({
    description: 'Include charts in PDF export',
    default: true,
  })
  @IsOptional()
  includeCharts?: boolean = true;
}
