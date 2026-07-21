import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SanitizeString } from '../../common/transformers/sanitize-string.transformer';

export class SubmitContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @SanitizeString()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  @IsEmail()
  @SanitizeString()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @SanitizeString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @SanitizeString()
  company?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @SanitizeString()
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  @SanitizeString()
  message: string;
}
