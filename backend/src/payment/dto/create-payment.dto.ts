import { PaymentProvider } from '../enums/payment-provider.enum';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}