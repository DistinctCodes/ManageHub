// backend/src/payments/dto/initialize-payment.dto.ts
import { IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { PaymentPlan } from '../entities/payment.entity';

export class InitializePaymentDto {
  @IsString()
  membershipType: string;

  @IsEnum(PaymentPlan)
  paymentPlan: PaymentPlan;

  @IsNumber()
  @Min(1)
  amount: number;
}
