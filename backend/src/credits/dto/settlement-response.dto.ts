import { ApiProperty } from '@nestjs/swagger';
import { SettlementBatch } from '../entities/settlement-batch.entity';
import { SettlementPayout } from '../entities/settlement-payout.entity';
import { SettlementBatchMode } from '../enums/settlement-batch-mode.enum';
import { SettlementBatchStatus } from '../enums/settlement-batch-status.enum';
import { SettlementPayoutStatus } from '../enums/settlement-payout-status.enum';
import { SettlementBatchBreakdown } from '../settlement.service';
import { LedgerEntryResponseDto } from './credits-response.dto';

export class SettlementPayoutResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty({ nullable: true }) accountId: string | null;
  @ApiProperty({ nullable: true }) externalAddress: string | null;
  @ApiProperty({ nullable: true }) basisPoints: number | null;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: SettlementPayoutStatus })
  status: SettlementPayoutStatus;
  @ApiProperty() idempotencyKey: string;
  @ApiProperty({
    nullable: true,
    description: 'The on-chain transaction reference for this payout leg',
  })
  onChainReference: string | null;
  @ApiProperty({ nullable: true }) ledgerTransactionId: string | null;
  @ApiProperty() attempts: number;
  @ApiProperty({ nullable: true }) lastError: string | null;
  @ApiProperty({ nullable: true }) confirmedAt: Date | null;

  static fromEntity(payout: SettlementPayout): SettlementPayoutResponseDto {
    const dto = new SettlementPayoutResponseDto();
    dto.id = payout.id;
    dto.label = payout.label;
    dto.accountId = payout.accountId;
    dto.externalAddress = payout.externalAddress;
    dto.basisPoints = payout.basisPoints;
    dto.amount = payout.amount;
    dto.currency = payout.currency;
    dto.status = payout.status;
    dto.idempotencyKey = payout.idempotencyKey;
    dto.onChainReference = payout.onChainReference;
    dto.ledgerTransactionId = payout.ledgerTransactionId;
    dto.attempts = payout.attempts;
    dto.lastError = payout.lastError;
    dto.confirmedAt = payout.confirmedAt;
    return dto;
  }
}

export class SettlementBatchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: SettlementBatchStatus }) status: SettlementBatchStatus;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: SettlementBatchMode }) mode: SettlementBatchMode;
  @ApiProperty({ nullable: true }) splitConfigId: string | null;
  @ApiProperty() periodEnd: Date;
  @ApiProperty() totalAmount: number;
  @ApiProperty() claimedEntryCount: number;
  @ApiProperty({ nullable: true }) notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(batch: SettlementBatch): SettlementBatchResponseDto {
    const dto = new SettlementBatchResponseDto();
    dto.id = batch.id;
    dto.status = batch.status;
    dto.currency = batch.currency;
    dto.mode = batch.mode;
    dto.splitConfigId = batch.splitConfigId;
    dto.periodEnd = batch.periodEnd;
    dto.totalAmount = batch.totalAmount;
    dto.claimedEntryCount = batch.claimedEntryCount;
    dto.notes = batch.notes;
    dto.createdAt = batch.createdAt;
    dto.updatedAt = batch.updatedAt;
    return dto;
  }
}

/**
 * The whole audit picture for one batch: what went in (the claimed ledger
 * entries), what came out (the payouts, per recipient), and the on-chain
 * reference for every leg that left the platform.
 */
export class SettlementBatchBreakdownResponseDto {
  @ApiProperty({ type: SettlementBatchResponseDto })
  batch: SettlementBatchResponseDto;

  @ApiProperty({ type: [SettlementPayoutResponseDto] })
  payouts: SettlementPayoutResponseDto[];

  @ApiProperty({
    type: [LedgerEntryResponseDto],
    description: 'The ledger entries this batch claimed — the "entries in"',
  })
  entries: LedgerEntryResponseDto[];

  @ApiProperty({
    description: 'Payout id -> on-chain transaction reference',
    example: [{ payoutId: 'uuid', reference: 'a1b2c3' }],
  })
  onChainReferences: Array<{ payoutId: string; reference: string }>;

  static fromBreakdown(
    breakdown: SettlementBatchBreakdown,
  ): SettlementBatchBreakdownResponseDto {
    const dto = new SettlementBatchBreakdownResponseDto();
    dto.batch = SettlementBatchResponseDto.fromEntity(breakdown.batch);
    dto.payouts = breakdown.payouts.map((payout) =>
      SettlementPayoutResponseDto.fromEntity(payout),
    );
    dto.entries = breakdown.entries.map((entry) =>
      LedgerEntryResponseDto.fromEntity(entry),
    );
    dto.onChainReferences = breakdown.onChainReferences;
    return dto;
  }
}
