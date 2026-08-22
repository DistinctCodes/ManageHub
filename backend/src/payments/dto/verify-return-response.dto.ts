import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

export class VerifyReturnResponseDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;

  @ApiProperty({
    description:
      'True only if the provider gave an authoritative confirmed/failed ' +
      'response within the bounded timeout. False means the caller should ' +
      'fall back to the real-time channel or polling — it never implies ' +
      'the payment failed.',
  })
  verified: boolean;
}
