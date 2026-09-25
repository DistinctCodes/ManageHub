import { ApiProperty } from '@nestjs/swagger';
import type { PaymentSweepSummary } from '../payment-credits.service';

/** Counts produced by one confirmed-payment credit sweep pass. */
export class PaymentSweepResponseDto {
  @ApiProperty({ description: 'Confirmed payments considered by the pass' })
  candidates: number;
  @ApiProperty({ description: 'Payments whose credit effect was applied' })
  applied: number;
  @ApiProperty({ description: 'Payments skipped because they were already handled' })
  skipped: number;
  @ApiProperty({ description: 'Payments whose application failed during the pass' })
  failed: number;

  static fromView(summary: PaymentSweepSummary): PaymentSweepResponseDto {
    return Object.assign(new PaymentSweepResponseDto(), summary);
  }
}
