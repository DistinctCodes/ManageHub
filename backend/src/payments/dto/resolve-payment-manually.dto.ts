import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

export class ResolvePaymentManuallyDto {
  @ApiProperty({ enum: [PaymentStatus.CONFIRMED, PaymentStatus.FAILED] })
  @IsIn([PaymentStatus.CONFIRMED, PaymentStatus.FAILED])
  resolution: PaymentStatus.CONFIRMED | PaymentStatus.FAILED;

  @ApiProperty({ description: 'Required — audited alongside the resolution' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
