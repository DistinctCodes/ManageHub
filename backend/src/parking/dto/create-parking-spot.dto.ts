import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParkingSpotType } from '../entities/parking-spot.entity';

export class CreateParkingSpotDto {
  @ApiProperty({ example: 'A-12' })
  @IsString()
  @MaxLength(20)
  spotNumber: string;

  @ApiPropertyOptional({ example: 'Ground Floor' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level?: string;

  @ApiPropertyOptional({ enum: ParkingSpotType, default: ParkingSpotType.STANDARD })
  @IsOptional()
  @IsEnum(ParkingSpotType)
  type?: ParkingSpotType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}