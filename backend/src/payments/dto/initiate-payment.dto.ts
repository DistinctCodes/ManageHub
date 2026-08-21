import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PaymentRail } from '../enums/payment-rail.enum';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Booking (or order) this payment is for' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Amount in minor units (e.g. cents)',
    example: 5000,
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ enum: PaymentRail })
  @IsEnum(PaymentRail)
  rail: PaymentRail;

  @ApiPropertyOptional({
    description: 'Payment provider identifier, e.g. paystack',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
