import { ApiProperty } from '@nestjs/swagger';
import {
  ReconciliationRun,
  ReconciliationRunOutcome,
} from '../entities/reconciliation-run.entity';

export class ReconciliationRunResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ nullable: true }) finishedAt: Date | null;
  @ApiProperty({ nullable: true }) durationMs: number | null;
  @ApiProperty() candidates: number;
  @ApiProperty() resolved: number;
  @ApiProperty() pending: number;
  @ApiProperty() providerErrors: number;
  @ApiProperty() escalatedToManualReview: number;
  @ApiProperty() expiredSwept: number;
  @ApiProperty({
    enum: ['succeeded', 'failed'],
    nullable: true,
    description: 'Null only while a run is still in progress.',
  })
  outcome: ReconciliationRunOutcome | null;
  @ApiProperty({ nullable: true }) error: string | null;
  @ApiProperty({ nullable: true, type: Object }) details: Record<
    string,
    unknown
  > | null;

  static fromEntity(run: ReconciliationRun): ReconciliationRunResponseDto {
    const dto = new ReconciliationRunResponseDto();
    dto.id = run.id;
    dto.startedAt = run.startedAt;
    dto.finishedAt = run.finishedAt;
    dto.durationMs = run.durationMs;
    dto.candidates = run.candidates;
    dto.resolved = run.resolved;
    dto.pending = run.pending;
    dto.providerErrors = run.providerErrors;
    dto.escalatedToManualReview = run.escalatedToManualReview;
    dto.expiredSwept = run.expiredSwept;
    dto.outcome = run.outcome;
    dto.error = run.error;
    dto.details = run.details;
    return dto;
  }
}
