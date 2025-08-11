import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus } from '../enums/maintenance-status.enum';

export class CreateMaintenanceRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}
