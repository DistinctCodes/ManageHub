import { IsString, IsEnum, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from '../enums/announcement-type.enum';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: AnnouncementType, default: AnnouncementType.GENERAL })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'ISO 8601 expiry datetime' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}