import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { LedgerAccountKind } from '../enums/ledger-account-kind.enum';

export class CreateLedgerAccountDto {
  @ApiProperty({ enum: LedgerAccountKind })
  @IsEnum(LedgerAccountKind)
  kind: LedgerAccountKind;

  @ApiPropertyOptional({
    description:
      'The user / hub / referrer this account belongs to. Omit for the ' +
      'singleton system accounts (TREASURY, REVENUE, PLATFORM_FEE).',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description:
      'How far below zero a charge may take this account, in minor units. ' +
      'Only meaningful for USER accounts.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  overdraftLimit?: number;

  @ApiPropertyOptional({
    description:
      'Where this balance goes when settled off-platform. Setting one is ' +
      'what makes the account eligible for a NET_PAYABLE settlement batch.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externalPayoutAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateLedgerAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  overdraftLimit?: number;

  @ApiPropertyOptional({
    description: 'Pass an empty string to clear the payout address.',
  })
  @IsOptional()
  @IsString()
  externalPayoutAddress?: string;

  @ApiPropertyOptional({
    description: 'A frozen account rejects debits but still accepts credits.',
  })
  @IsOptional()
  @IsBoolean()
  frozen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}

export class AdjustCreditsDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description:
      'Minor units. Positive credits the member, negative debits them. ' +
      'Posted as a new ADJUSTMENT transaction — nothing already in the ' +
      'ledger is ever edited.',
    example: -500,
  })
  @IsInt()
  delta: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ description: 'Natural key making this adjustment idempotent' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AttachSplitConfigDto {
  @ApiProperty()
  @IsUUID()
  splitConfigId: string;
}

export class AbandonSettlementBatchDto {
  @ApiProperty({
    description:
      'Why this batch is being given up on — recorded on the batch and on ' +
      'every payout it fails.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateSettlementBatchDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description:
      'Name of a RevenueSplitConfig. Supplied: the batch distributes the ' +
      'revenue account across that config. Omitted: the batch nets each ' +
      'payable account and pays its own address.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  splitConfigName?: string;
}
