import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaintenanceDto {
  @IsNotEmpty()
  assetId: number;

  @IsDateString()
  scheduledDate: Date;

  @IsString()
  maintenanceType: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
