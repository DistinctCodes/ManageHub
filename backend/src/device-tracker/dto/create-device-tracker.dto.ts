import { IsString, IsOptional, IsBoolean, IsIP, IsEnum, IsNumber, IsDecimal, IsLatitude, IsLongitude } from 'class-validator';
import { DeviceType, DeviceStatus, RiskLevel } from '../entities/device-tracker.entity';

export class CreateDeviceTrackerDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(DeviceType)
  deviceType: DeviceType;

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

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsNumber()
  riskScore?: number;

  // Geolocation fields
  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  countryName?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  isp?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  // Browser/Device details
  @IsOptional()
  @IsString()
  browserName?: string;

  @IsOptional()
  @IsString()
  browserVersion?: string;

  @IsOptional()
  @IsString()
  osName?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  deviceVendor?: string;

  // Security flags
  @IsOptional()
  @IsBoolean()
  isVpn?: boolean;

  @IsOptional()
  @IsBoolean()
  isProxy?: boolean;

  @IsOptional()
  @IsBoolean()
  isTor?: boolean;

  @IsOptional()
  @IsBoolean()
  isHosting?: boolean;

  @IsOptional()
  @IsBoolean()
  isMobile?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}