import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ResponseStatus } from '../entities/event-registration-response.entity';

export class CreateRegistrationResponseDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  formId: string;

  @IsUUID()
  @IsOptional()
  rsvpId?: string;

  @IsString()
  @Length(1, 255)
  respondentName: string;

  @IsEmail()
  respondentEmail: string;

  @IsPhoneNumber()
  @IsOptional()
  respondentPhone?: string;

  @IsObject()
  responses: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateRegistrationResponseDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  respondentName?: string;

  @IsEmail()
  @IsOptional()
  respondentEmail?: string;

  @IsPhoneNumber()
  @IsOptional()
  respondentPhone?: string;

  @IsObject()
  @IsOptional()
  responses?: Record<string, any>;

  @IsEnum(ResponseStatus)
  @IsOptional()
  status?: ResponseStatus;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  reviewNotes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  score?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ResponseQueryDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  formId?: string;

  @IsUUID()
  @IsOptional()
  rsvpId?: string;

  @IsString()
  @IsOptional()
  respondentEmail?: string;

  @IsEnum(ResponseStatus)
  @IsOptional()
  status?: ResponseStatus;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class BulkUpdateResponseDto {
  @IsUUID('4', { each: true })
  responseIds: string[];

  @IsEnum(ResponseStatus)
  @IsOptional()
  status?: ResponseStatus;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  reviewNotes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  score?: number;
}

export class ExportResponsesDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  formId?: string;

  @IsEnum(ResponseStatus)
  @IsOptional()
  status?: ResponseStatus;

  @IsString()
  @IsOptional()
  @IsEnum(['csv', 'xlsx', 'json'])
  format?: 'csv' | 'xlsx' | 'json';

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString('4', { each: true })
  @IsOptional()
  includedFields?: string[];

  @IsString('4', { each: true })
  @IsOptional()
  excludedFields?: string[];
}
