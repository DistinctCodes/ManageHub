import { IsString, IsOptional, IsBoolean, IsIP } from 'class-validator';

export class CreateDeviceTrackerDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  deviceType: string;

  @IsIP()
  ipAddress: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @IsOptional()
  @IsBoolean()
  isTrusted?: boolean;
}