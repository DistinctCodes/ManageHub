import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { ContactType } from '../entities/contact.entity';

export class SearchContactDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
