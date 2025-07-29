import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceVendorVisitDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  personName: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsDateString()
  visitTime: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

export class UpdateServiceVendorVisitDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  personName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  service?: string;

  @IsOptional()
  @IsDateString()
  visitTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

export class ServiceVendorVisitQueryDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}