import {
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsArray,
  IsObject,
  Min,
  Max,
  Length,
  IsUrl,
} from 'class-validator';
import { EventType, EventStatus } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  @Length(1, 2000)
  description: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType = EventType.OTHER;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @Length(1, 500)
  location: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  capacity: number;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = EventStatus.DRAFT;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  organizerId?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  organizerName?: string;

  @IsEmail()
  @IsOptional()
  organizerEmail?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  requirements?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  agenda?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = true;

  @IsBoolean()
  @IsOptional()
  allowWaitlist?: boolean = true;

  @IsDateString()
  @IsOptional()
  registrationDeadline?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  cancellationPolicy?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  additionalInfo?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
