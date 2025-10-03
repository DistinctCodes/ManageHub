import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, MinLength, MaxLength, Matches, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD', description: 'ISO 4217 currency code' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, { message: 'Currency code must be exactly 3 uppercase letters' })
  code: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'US Dollar' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 10, example: '$' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  symbol?: string;

  @ApiPropertyOptional({ example: 1.0, description: 'Exchange rate to base currency (USD)' })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @ApiPropertyOptional({ default: false, description: 'Whether this is the base currency' })
  @IsOptional()
  @IsBoolean()
  isBaseCurrency?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'Number of decimal places for this currency' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  decimalPlaces?: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  countryId?: string;
}
