import { IsInt, IsNumber, IsOptional } from 'class-validator';
export class UpdateConfigDto {
  @IsOptional()
  @IsInt()
  deviceCount?: number;

  @IsOptional()
  @IsInt()
  syncFrequency?: number;

  @IsOptional()
  @IsNumber()
  failureRate?: number;
} 