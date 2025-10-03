import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExchangeRateDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fromCurrencyId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  toCurrencyId: string;

  @ApiProperty({ example: 0.85, description: 'Exchange rate from fromCurrency to toCurrency' })
  @IsNumber()
  @Min(0.000001)
  rate: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Date when this rate becomes effective' })
  @IsDateString()
  effectiveDate: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'ECB', description: 'Source of the exchange rate' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
