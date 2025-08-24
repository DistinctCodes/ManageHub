import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';
import { ContactType } from '../entities/contact.entity';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]{10,20}$/, {
    message:
      'Phone number must be a valid format (10-20 characters, can include +, spaces, hyphens, parentheses)',
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  organization: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  designation: string;

  @IsEnum(ContactType)
  type: ContactType;

  @IsOptional()
  @IsString()
  notes?: string;
}
