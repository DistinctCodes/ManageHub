import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayHoursDto } from './business-hours.dto';

class BusinessHoursDto {
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  monday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  tuesday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  wednesday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  thursday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  friday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  saturday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  sunday?: DayHoursDto;
}

export class UpdateHubSettingsDto {
  @ApiPropertyOptional({ example: 'ManageHub Store' })
  @IsString()
  @IsOptional()
  @Length(1, 255)
  hubName?: string;

  @ApiPropertyOptional({ example: 'Your one-stop shop for everything.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@managehub.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  @Length(1, 50)
  contactPhone?: string;

  @ApiPropertyOptional({ example: '1 Example Street, Lagos, Nigeria' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description:
      'Business hours per day. Each day: { open: "HH:mm", close: "HH:mm", isOpen: boolean }',
    example: {
      monday: { open: '08:00', close: '20:00', isOpen: true },
      sunday: { open: '10:00', close: '16:00', isOpen: false },
    },
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  timezone?: string;

  @ApiPropertyOptional({
    example: 7.5,
    description: 'Tax rate as a percentage (0–100)',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsString()
  @IsOptional()
  @Length(1, 10)
  currency?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;
}
