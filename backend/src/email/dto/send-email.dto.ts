import { IsEmail, IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailType } from '../entities/email-log.entity';

class EmailAttachmentDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  @IsEmail()
  to: string;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  priority?: number;
}
