import { IsArray, IsString, IsOptional, IsEnum, ValidateNested, IsObject, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailType } from '../entities/email-log.entity';

class BulkEmailRecipientDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;
}

export class BulkEmailDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkEmailRecipientDto)
  recipients: BulkEmailRecipientDto[];

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsEnum(EmailType)
  emailType?: EmailType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  batchSize?: number;

  @IsOptional()
  delayBetweenBatches?: number;
}
