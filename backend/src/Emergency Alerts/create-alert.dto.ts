import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
  MinLength,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { AlertSeverity } from "./emergency-alert.entity";

export class CreateAlertDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity = AlertSeverity.MEDIUM;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
