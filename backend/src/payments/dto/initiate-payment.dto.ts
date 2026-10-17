import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsCurrencyCode } from '../../common/currency-code.decorator';
import { transformCurrencyCode } from '../../common/currency-code';
import { MinorUnits } from '../utils/minor-units.decorator';
import { PaymentRail } from '../enums/payment-rail.enum';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Booking (or order) this payment is for' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Amount in minor units (e.g. cents)',
    example: 5000,
  })
  @MinorUnits()
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'USD' })
  @Transform(transformCurrencyCode)
  @IsString()
  @IsCurrencyCode()
  currency: string;

  @ApiProperty({ enum: PaymentRail })
  @IsEnum(PaymentRail)
  rail: PaymentRail;

  @ApiPropertyOptional({
    description: 'Payment provider identifier, e.g. paystack',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provider?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
