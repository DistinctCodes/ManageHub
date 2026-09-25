import { ApiProperty } from '@nestjs/swagger';
import type { ReconciliationMetrics } from '../reconciliation.service';

/**
 * The operational signal exposed to administrators when the reconciliation
 * queue needs attention. The service owns the calculation; this DTO keeps the
 * wire shape explicit and stable for OpenAPI consumers.
 */
export class ReconciliationMetricsResponseDto {
  @ApiProperty({ description: 'Payments currently awaiting manual review' })
  manualReviewQueueDepth: number;

  @ApiProperty({ description: 'Queue depth at which alerting is enabled' })
  alertThreshold: number;

  @ApiProperty({ description: 'True when the queue exceeds the alert threshold' })
  alerting: boolean;

  static fromView(view: ReconciliationMetrics): ReconciliationMetricsResponseDto {
    return Object.assign(new ReconciliationMetricsResponseDto(), view);
  }
}
