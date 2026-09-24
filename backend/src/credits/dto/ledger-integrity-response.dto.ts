import { ApiProperty } from '@nestjs/swagger';
import type { LedgerIntegrityReport } from '../ledger.service';

/** One account whose cached balance disagrees with its ledger entries. */
export class LedgerBalanceDriftResponseDto {
  @ApiProperty() accountId: string;
  @ApiProperty({ description: 'Balance stored on the account row' })
  materialized: number;
  @ApiProperty({ description: 'Balance derived from the append-only entries' })
  derived: number;

  static fromView(
    row: LedgerIntegrityReport['balanceDrift'][number],
  ): LedgerBalanceDriftResponseDto {
    const dto = new LedgerBalanceDriftResponseDto();
    dto.accountId = row.accountId;
    dto.materialized = row.materialized;
    dto.derived = row.derived;
    return dto;
  }
}

/** One transaction whose debit and credit legs do not cancel. */
export class LedgerUnbalancedTransactionResponseDto {
  @ApiProperty() transactionId: string;
  @ApiProperty() debits: number;
  @ApiProperty() credits: number;

  static fromView(
    row: LedgerIntegrityReport['unbalancedTransactions'][number],
  ): LedgerUnbalancedTransactionResponseDto {
    const dto = new LedgerUnbalancedTransactionResponseDto();
    dto.transactionId = row.transactionId;
    dto.debits = row.debits;
    dto.credits = row.credits;
    return dto;
  }
}

/**
 * A full re-derivation of the ledger cache. Empty drift and imbalance lists
 * are the healthy state; both are retained in the response so an operator
 * can diagnose the exact account or transaction involved.
 */
export class LedgerIntegrityResponseDto {
  @ApiProperty() accountsChecked: number;
  @ApiProperty({ type: [LedgerBalanceDriftResponseDto] })
  balanceDrift: LedgerBalanceDriftResponseDto[];
  @ApiProperty({ type: [LedgerUnbalancedTransactionResponseDto] })
  unbalancedTransactions: LedgerUnbalancedTransactionResponseDto[];

  static fromView(
    report: LedgerIntegrityReport,
  ): LedgerIntegrityResponseDto {
    const dto = new LedgerIntegrityResponseDto();
    dto.accountsChecked = report.accountsChecked;
    dto.balanceDrift = report.balanceDrift.map((row) =>
      LedgerBalanceDriftResponseDto.fromView(row),
    );
    dto.unbalancedTransactions = report.unbalancedTransactions.map((row) =>
      LedgerUnbalancedTransactionResponseDto.fromView(row),
    );
    return dto;
  }
}
