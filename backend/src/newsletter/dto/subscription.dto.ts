import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SanitizeString } from '../../common/transformers/sanitize-string.transformer';

export class SubscribeNewsletterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  @IsEmail()
  @SanitizeString()
  email: string;
}

export class UnsubscribeNewsletterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @SanitizeString()
  token: string;
}

export class ConfirmNewsletterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @SanitizeString()
  token: string;
}
