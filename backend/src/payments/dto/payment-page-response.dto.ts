import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

export class PaymentPageResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items: PaymentResponseDto[];

  @ApiProperty({ description: 'Total number of payments matching the filters' })
  total: number;
}
