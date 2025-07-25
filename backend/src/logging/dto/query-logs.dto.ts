import { IsOptional, IsString, IsInt } from 'class-validator';
export class QueryLogsDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  status?: 'success' | 'failure';

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
} 