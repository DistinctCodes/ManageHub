import { ApiProperty } from '@nestjs/swagger';
import { PaymentRail } from '../enums/payment-rail.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import { Payment } from '../entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() bookingId: string;
  @ApiProperty() userId: string;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: PaymentRail }) rail: PaymentRail;
  @ApiProperty({
    enum: PaymentStatus,
    description: 'See the state machine in the API description',
  })
  status: PaymentStatus;
  @ApiProperty({ nullable: true }) provider: string | null;
  @ApiProperty({ nullable: true }) providerReference: string | null;
  @ApiProperty({ nullable: true }) expiresAt: Date | null;
  @ApiProperty({ enum: PaymentFailureReason, nullable: true })
  failureReason: PaymentFailureReason | null;
  @ApiProperty() reconciliationAttempts: number;
  @ApiProperty({ nullable: true }) manualReviewReason: string | null;
  @ApiProperty({ description: 'Minor units already refunded across all refund rows' })
  refundedAmount: number;
  @ApiProperty({ description: 'Minor units still refundable' })
  remainingAmount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    payment: Payment,
    refundedAmount: number = 0,
  ): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.bookingId = payment.bookingId;
    dto.userId = payment.userId;
    dto.amount = payment.amount;
    dto.currency = payment.currency;
    dto.rail = payment.rail;
    dto.status = payment.status;
    dto.provider = payment.provider;
    dto.providerReference = payment.providerReference;
    dto.expiresAt = payment.expiresAt;
    dto.failureReason = payment.failureReason;
    dto.reconciliationAttempts = payment.reconciliationAttempts;
    dto.manualReviewReason = payment.manualReviewReason;
    dto.refundedAmount = Math.max(0, refundedAmount);
    dto.remainingAmount = Math.max(0, payment.amount - dto.refundedAmount);
    dto.createdAt = payment.createdAt;
    dto.updatedAt = payment.updatedAt;
    return dto;
  }
}
