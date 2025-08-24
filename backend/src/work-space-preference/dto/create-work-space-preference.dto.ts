import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { PreferenceType } from '../entities/work-space-preference.entity';

export class CreateWorkspacePreferenceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(PreferenceType)
  preferenceType: PreferenceType;

  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
