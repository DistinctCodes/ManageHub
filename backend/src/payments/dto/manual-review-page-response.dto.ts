import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

/**
 * Paginated manual-review queue response (issue #1944). `total` is the
 * full count of MANUAL_REVIEW payments, independent of the current page,
 * so a client can compute the last page and render a pager.
 */
export class ManualReviewPageResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items: PaymentResponseDto[];

  @ApiProperty({
    description: 'Total MANUAL_REVIEW payments across all pages',
    type: Number,
  })
  total: number;
}
