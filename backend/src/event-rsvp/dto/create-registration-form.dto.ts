import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  IsEnum,
  IsNumber,
  IsUUID,
  ValidateNested,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  FieldType, 
  ValidationRule, 
  RegistrationFormField, 
  FieldOption, 
  FieldValidation, 
  ConditionalLogic, 
  FieldSettings, 
  FormSettings 
} from '../entities/event-registration-form.entity';

export class CreateRegistrationFormDto {
  @IsUUID()
  eventId: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationFormFieldDto)
  fields: RegistrationFormFieldDto[];

  @IsObject()
  @IsOptional()
  settings?: FormSettings;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: string;

  @IsString()
  createdBy: string;
}

export class UpdateRegistrationFormDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  description?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RegistrationFormFieldDto)
  fields?: RegistrationFormFieldDto[];

  @IsObject()
  @IsOptional()
  settings?: FormSettings;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}

export class RegistrationFormFieldDto {
  @IsString()
  id: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 255)
  label: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  placeholder?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsBoolean()
  required: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  order: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FieldValidationDto)
  validation?: FieldValidationDto[];

  @IsObject()
  @IsOptional()
  conditional?: ConditionalLogic;

  @IsOptional()
  defaultValue?: any;

  @IsObject()
  @IsOptional()
  settings?: FieldSettings;
}

export class FieldOptionDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  disabled?: boolean;
}

export class FieldValidationDto {
  @IsEnum(ValidationRule)
  rule: ValidationRule;

  @IsOptional()
  value?: any;

  @IsString()
  @IsOptional()
  message?: string;
}

export class FormQueryDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
}