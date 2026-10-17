import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsCurrencyCode } from '../../common/currency-code.decorator';
import { transformCurrencyCode } from '../../common/currency-code';
import { MinorUnits } from '../../payments/utils/minor-units.decorator';

export class ChargeCreditsDto {
  @ApiProperty({ description: 'The member whose credit balance is charged' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Amount in minor units (e.g. cents) — never a float',
    example: 250,
  })
  @MinorUnits()
  amount: number;

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency code. Defaults to CREDITS_DEFAULT_CURRENCY.',
    example: 'USD',
  })
  @IsOptional()
  @Transform(transformCurrencyCode)
  @IsString()
  @IsCurrencyCode()
  currency?: string;

  @ApiProperty({
    description:
      'The caller-owned natural key for what is being charged (a usage ' +
      'event id, a print job id). Replaying the same reference returns the ' +
      'original charge instead of charging twice.',
    example: 'print-job-8f21',
  })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({
    description: 'Why this charge happened — stored on the ledger',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
