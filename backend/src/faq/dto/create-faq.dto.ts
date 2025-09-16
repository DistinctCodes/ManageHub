import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FAQCategory, FAQStatus } from '../faq.entity';

export class CreateFAQDto {
  @IsString()
  @MinLength(10, { message: 'Question must be at least 10 characters long' })
  @MaxLength(500, { message: 'Question must not exceed 500 characters' })
  question: string;

  @IsString()
  @MinLength(20, { message: 'Answer must be at least 20 characters long' })
  answer: string;

  @IsEnum(FAQCategory)
  @IsOptional()
  category?: FAQCategory = FAQCategory.GENERAL;

  @IsEnum(FAQStatus)
  @IsOptional()
  status?: FAQStatus = FAQStatus.ACTIVE;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1000)
  @IsOptional()
  priority?: number = 0;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  createdBy?: string;
}
