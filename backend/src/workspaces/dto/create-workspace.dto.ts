import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';
import { WorkspaceType } from '../enums/workspace-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Hot Desk A' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: WorkspaceType })
  @IsEnum(WorkspaceType)
  type: WorkspaceType;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  totalSeats: number;

  @ApiProperty({ description: 'Hourly rate in kobo', example: 500000 })
  @IsInt()
  @Min(1)
  hourlyRate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
