import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { WorkspaceType } from '../../workspaces/enums/workspace-type.enum';

export class CreateMembershipPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price in kobo' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBookingsPerMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  meetingRoomHoursPerMonth?: number;

  @ApiProperty({ enum: WorkspaceType, isArray: true })
  @IsArray()
  @IsEnum(WorkspaceType, { each: true })
  allowedWorkspaceTypes: WorkspaceType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}