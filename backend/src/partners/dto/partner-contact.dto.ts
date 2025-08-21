import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ContactType } from '../entities/partner-contact.entity';

export class CreatePartnerContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdatePartnerContactDto {
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
