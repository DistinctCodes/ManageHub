import {
  IsEmail,
  IsHexColor,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHubSettingsDto {
  @ApiPropertyOptional({ example: 'My Coworking Hub' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hubName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  /** IANA timezone string — validated against Intl.supportedValuesOf in service */
  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 7.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRatePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  businessHours?: Record<
    string,
    { open?: string; close?: string; closed: boolean }
  >;

  @ApiPropertyOptional({ example: 'admin@hub.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#1a56db' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bookingLeadTimeHours?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookingDaysAhead?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationPolicyHours?: number;
}