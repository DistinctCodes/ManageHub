import { IsString, IsEmail, IsOptional, IsArray, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateApiKeyDto {
  @IsString()
  appName: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEndpoints?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  dailyLimit?: number = 1000;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}