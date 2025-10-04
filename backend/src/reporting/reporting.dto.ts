import { IsOptional, IsString, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string; // inclusive

  @IsOptional()
  @IsISO8601()
  endDate?: string; // inclusive

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf' = 'csv';
}
