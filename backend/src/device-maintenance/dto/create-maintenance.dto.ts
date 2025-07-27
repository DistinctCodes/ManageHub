import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  EMERGENCY = 'emergency',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: 'device-uuid-here' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'Quarterly Router Maintenance' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Clean air filters, update firmware, check connections',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.PREVENTIVE })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty({ example: '2024-02-15T10:00:00Z' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  technician: string;

  @ApiProperty({ example: 150.5, required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({
    example: 'Schedule during low traffic hours',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: ['Air filter', 'Thermal paste'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parts?: string[];
}

export class UpdateMaintenanceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaintenanceType, required: false })
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  @ApiProperty({ enum: MaintenanceStatus, required: false })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  technician?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parts?: string[];
}
