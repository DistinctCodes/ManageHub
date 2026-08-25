import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerAccount } from '../entities/ledger-account.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { LedgerTransaction } from '../entities/ledger-transaction.entity';
import { MeteredUsageEvent } from '../entities/metered-usage-event.entity';
import { PaymentCreditApplication } from '../entities/payment-credit-application.entity';
import { LedgerAccountKind } from '../enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from '../enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from '../enums/ledger-transaction-kind.enum';
import { MeteredResource } from '../enums/metered-resource.enum';
import { PaymentCreditApplicationKind } from '../enums/payment-credit-application-kind.enum';
import { CreditBalanceView } from '../credits.service';

export class CreditBalanceResponseDto {
  @ApiProperty({ nullable: true }) accountId: string | null;
  @ApiProperty() userId: string;
  @ApiProperty() currency: string;
  @ApiProperty({ description: 'Minor units; may be negative if overdrawn' })
  balance: number;
  @ApiProperty() overdraftLimit: number;
  @ApiProperty({ description: 'balance + overdraftLimit' }) spendable: number;
  @ApiProperty() frozen: boolean;

  static fromView(view: CreditBalanceView): CreditBalanceResponseDto {
    return Object.assign(new CreditBalanceResponseDto(), view);
  }
}

export class LedgerTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: LedgerTransactionKind }) kind: LedgerTransactionKind;
  @ApiProperty() reference: string;
  @ApiProperty() currency: string;
  @ApiProperty() amount: number;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(
    transaction: LedgerTransaction,
  ): LedgerTransactionResponseDto {
    const dto = new LedgerTransactionResponseDto();
    dto.id = transaction.id;
    dto.kind = transaction.kind;
    dto.reference = transaction.reference;
    dto.currency = transaction.currency;
    dto.amount = transaction.amount;
    dto.description = transaction.description;
    dto.createdAt = transaction.createdAt;
    return dto;
  }
}

export class ChargeCreditsResponseDto {
  @ApiProperty({ type: LedgerTransactionResponseDto })
  transaction: LedgerTransactionResponseDto;
  @ApiProperty({
    description:
      'False when this reference had already been charged — the response ' +
      'describes the original charge and nothing new was posted.',
  })
  posted: boolean;
  @ApiProperty() balanceAfter: number;
  @ApiProperty() currency: string;
}

export class LedgerEntryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() transactionId: string;
  @ApiProperty() accountId: string;
  @ApiProperty({ enum: LedgerEntryDirection }) direction: LedgerEntryDirection;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty({ nullable: true }) settlementBatchId: string | null;
  @ApiProperty({ nullable: true }) settledAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(entry: LedgerEntry): LedgerEntryResponseDto {
    const dto = new LedgerEntryResponseDto();
    dto.id = entry.id;
    dto.transactionId = entry.transactionId;
    dto.accountId = entry.accountId;
    dto.direction = entry.direction;
    dto.amount = entry.amount;
    dto.currency = entry.currency;
    dto.settlementBatchId = entry.settlementBatchId;
    dto.settledAt = entry.settledAt;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class LedgerAccountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: LedgerAccountKind }) kind: LedgerAccountKind;
  @ApiProperty({ nullable: true }) ownerId: string | null;
  @ApiProperty() currency: string;
  @ApiProperty() balance: number;
  @ApiProperty() overdraftLimit: number;
  @ApiProperty({ nullable: true }) externalPayoutAddress: string | null;
  @ApiProperty() frozen: boolean;
  @ApiProperty({ nullable: true }) label: string | null;

  static fromEntity(account: LedgerAccount): LedgerAccountResponseDto {
    const dto = new LedgerAccountResponseDto();
    dto.id = account.id;
    dto.kind = account.kind;
    dto.ownerId = account.ownerId;
    dto.currency = account.currency;
    dto.balance = account.balance;
    dto.overdraftLimit = account.overdraftLimit;
    dto.externalPayoutAddress = account.externalPayoutAddress;
    dto.frozen = account.frozen;
    dto.label = account.label;
    return dto;
  }
}

export class MeteredUsageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: MeteredResource }) resource: MeteredResource;
  @ApiProperty() units: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() usageReference: string;
  @ApiProperty() ledgerTransactionId: string;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({
    description: 'False when this usage event had already been charged.',
  })
  charged?: boolean;

  static fromEntity(
    event: MeteredUsageEvent,
    charged?: boolean,
  ): MeteredUsageResponseDto {
    const dto = new MeteredUsageResponseDto();
    dto.id = event.id;
    dto.userId = event.userId;
    dto.resource = event.resource;
    dto.units = event.units;
    dto.unitPrice = event.unitPrice;
    dto.amount = event.amount;
    dto.currency = event.currency;
    dto.usageReference = event.usageReference;
    dto.ledgerTransactionId = event.ledgerTransactionId;
    dto.createdAt = event.createdAt;
    dto.charged = charged;
    return dto;
  }
}

export class PaymentCreditApplicationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() paymentId: string;
  @ApiProperty({ enum: PaymentCreditApplicationKind })
  kind: PaymentCreditApplicationKind;
  @ApiProperty({ nullable: true }) splitConfigId: string | null;
  @ApiProperty({ nullable: true }) ledgerTransactionId: string | null;
  @ApiProperty({ nullable: true }) appliedAt: Date | null;
  @ApiProperty({ nullable: true }) lastError: string | null;

  static fromEntity(
    application: PaymentCreditApplication,
  ): PaymentCreditApplicationResponseDto {
    const dto = new PaymentCreditApplicationResponseDto();
    dto.id = application.id;
    dto.paymentId = application.paymentId;
    dto.kind = application.kind;
    dto.splitConfigId = application.splitConfigId;
    dto.ledgerTransactionId = application.ledgerTransactionId;
    dto.appliedAt = application.appliedAt;
    dto.lastError = application.lastError;
    return dto;
  }
}
