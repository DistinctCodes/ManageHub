import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CompleteMaintenanceDto {
  @IsDateString()
  completedDate: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
