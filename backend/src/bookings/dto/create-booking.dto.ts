import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PlanType } from '../enums/plan-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  seatCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
