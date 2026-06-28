import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  hostName: string;

  @ApiProperty({ example: '2026-07-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-01T12:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
