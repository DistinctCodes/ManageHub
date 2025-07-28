import { IsOptional, IsDateString, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryEnergyDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 100;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;
}