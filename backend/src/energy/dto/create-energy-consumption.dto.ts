import { IsString, IsNumber, IsDateString, IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnergyConsumptionDto {
  @IsString()
  workspaceId: string;

  @IsString()
  workspaceName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  powerConsumptionKwh: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deviceCount?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}
