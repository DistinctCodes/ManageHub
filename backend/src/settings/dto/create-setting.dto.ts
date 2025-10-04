import { IsOptional, IsString } from 'class-validator';

export class CreateSettingDto {
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  depreciationMethod?: string;
}

