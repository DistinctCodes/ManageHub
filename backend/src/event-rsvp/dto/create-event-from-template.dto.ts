import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsObject,
  Min,
  Length,
} from 'class-validator';

export class CreateEventFromTemplateDto {
  @IsString()
  templateId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsObject()
  @IsOptional()
  overrides?: Record<string, any>;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  customMessage?: string;

  @IsString()
  createdBy: string;
}

export class CreateEventSeriesDto {
  @IsString()
  templateId: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxEvents?: number;

  @IsObject()
  @IsOptional()
  overrides?: Record<string, any>;

  @IsString()
  createdBy: string;
}