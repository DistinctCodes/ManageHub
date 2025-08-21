import { IsString, IsOptional, IsBoolean, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePartnerContactDto } from './partner-contact.dto';
import { CreatePartnerServiceDto } from './partner-service.dto';

export class CreatePartnerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePartnerContactDto)
  @IsOptional()
  contacts?: CreatePartnerContactDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePartnerServiceDto)
  @IsOptional()
  services?: CreatePartnerServiceDto[];
}

export class UpdatePartnerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
