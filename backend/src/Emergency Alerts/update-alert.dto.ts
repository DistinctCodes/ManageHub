import { IsString, IsEnum, IsOptional, IsDateString } from "class-validator";
import { AlertStatus } from "./emergency-alert.entity";

export class UpdateAlertDto {
  @IsEnum(AlertStatus)
  @IsOptional()
  status?: AlertStatus;

  @IsString()
  @IsOptional()
  resolvedBy?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
