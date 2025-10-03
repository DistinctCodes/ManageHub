import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ minLength: 2, maxLength: 2, example: 'US', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'ISO2 code must be exactly 2 uppercase letters' })
  iso2Code: string;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USA', description: 'ISO 3166-1 alpha-3 country code' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, { message: 'ISO3 code must be exactly 3 uppercase letters' })
  iso3Code: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'United States of America' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100, example: 'United States' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  commonName?: string;

  @ApiPropertyOptional({ example: '840' })
  @IsOptional()
  @IsString()
  numericCode?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 10, example: '+1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  callingCode?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 50, example: 'Washington, D.C.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  capital?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 50, example: 'Americas' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 50, example: 'North America' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  subregion?: string;

  @ApiPropertyOptional({ example: 9833517.85 })
  @IsOptional()
  @IsNumber()
  area?: number;

  @ApiPropertyOptional({ example: 331002651 })
  @IsOptional()
  @IsInt()
  population?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
