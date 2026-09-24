import { ApiProperty } from '@nestjs/swagger';
import type { SettlementRunSummary } from '../settlement.service';

/** Aggregate progress and outcomes from one settlement pass. */
export class SettlementRunResponseDto {
  @ApiProperty() batchesCreated: number;
  @ApiProperty() batchesExecuted: number;
  @ApiProperty() payoutsSubmitted: number;
  @ApiProperty() payoutsConfirmed: number;
  @ApiProperty() payoutsFailed: number;
  @ApiProperty() payoutsAwaitingRail: number;
  @ApiProperty() entriesSettled: number;
  @ApiProperty({ type: String, isArray: true })
  notes: string[];

  static fromView(summary: SettlementRunSummary): SettlementRunResponseDto {
    return Object.assign(new SettlementRunResponseDto(), summary);
  }
}
