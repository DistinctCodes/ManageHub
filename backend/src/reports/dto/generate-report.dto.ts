import { IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ReportType } from '../enums/report-type.enum';
import { ReportFormat } from '../enums/report-format.enum';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.JSON;
}