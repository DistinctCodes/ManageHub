import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DiscountType } from '../enums/discount-type.enum';
import { WorkspaceType } from '../../workspaces/enums/workspace-type.enum';

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsInt()
  @Min(1)
  @Max(100000000)
  discountValue: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minBookingAmount?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(WorkspaceType, { each: true })
  applicableWorkspaceTypes?: WorkspaceType[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
