import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export enum DeviceType {
  ROUTER = 'router',
  PROJECTOR = 'projector',
  PRINTER = 'printer',
  SERVER = 'server',
  SWITCH = 'switch',
  COMPUTER = 'computer',
  OTHER = 'other',
}

export class CreateDeviceDto {
  @ApiProperty({ example: 'Main Office Router' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: DeviceType, example: DeviceType.ROUTER })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiProperty({ example: 'Main Office - IT Room' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'RT-ABC123', required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'Cisco ISR4321', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: '2023-01-15', required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ example: '2026-01-15', required: false })
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiProperty({ example: 90, description: 'Maintenance interval in days' })
  @IsNumber()
  maintenanceIntervalDays: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'Primary network router for main office',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeviceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: DeviceType, required: false })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maintenanceIntervalDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
