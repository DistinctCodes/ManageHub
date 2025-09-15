import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
  Length,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { EventType } from '../entities/event.entity';
import { RecurrenceType, TemplateStatus } from '../entities/event-template.entity';

export class CreateEventTemplateDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  @Length(1, 2000)
  description: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType = EventType.OTHER;

  @IsString()
  @Length(1, 500)
  location: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  defaultCapacity: number;

  @IsNumber()
  @Min(15)
  @Max(1440) // max 24 hours
  defaultDuration: number;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  category?: string;

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
  defaultPrice?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = true;

  @IsBoolean()
  @IsOptional()
  allowWaitlist?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(168) // max 1 week
  registrationDeadlineHours?: number = 24;

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

  @IsString()
  @IsOptional()
  @Length(0, 255)
  defaultOrganizerId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  defaultOrganizerName?: string;

  @IsString()
  @IsOptional()
  defaultOrganizerEmail?: string;

  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType = RecurrenceType.NONE;

  @IsNumber()
  @IsOptional()
  @Min(1)
  recurrenceInterval?: number;

  @IsObject()
  @IsOptional()
  recurrenceConfig?: Record<string, any>;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxOccurrences?: number;

  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus = TemplateStatus.ACTIVE;

  @IsString()
  createdBy: string;
}