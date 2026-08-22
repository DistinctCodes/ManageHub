import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

export class RefundResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() paymentId: string;
  @ApiProperty() amount: number;
  @ApiProperty() reason: string;
  @ApiProperty({ nullable: true }) actorId: string | null;
  @ApiProperty() createdAt: Date;
}

export class RequestRefundResponseDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;

  @ApiProperty({ type: RefundResponseDto })
  refund: RefundResponseDto;
}
