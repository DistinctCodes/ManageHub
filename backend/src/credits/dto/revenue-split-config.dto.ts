import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TOTAL_BASIS_POINTS } from '../split-allocation';

export class RevenueSplitRecipientDto {
  @ApiProperty({ example: 'platform fee' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    description:
      `Share in basis points (1/100th of a percent). Every recipient of a ` +
      `config must sum to exactly ${TOTAL_BASIS_POINTS} — a config that ` +
      `does not is rejected here, not at settlement time.`,
    example: 1500,
  })
  @IsInt()
  @Min(1)
  @Max(TOTAL_BASIS_POINTS)
  basisPoints: number;

  @ApiPropertyOptional({
    description:
      'Internal recipient: the ledger account credited with this share. ' +
      'Exactly one of accountId or externalAddress must be set.',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description:
      'External recipient: the on-chain address a settlement batch pays ' +
      'this share to. Not usable for a split attached to a Payment.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externalAddress?: string;

  @ApiPropertyOptional({
    description:
      'Deterministic tie-breaker for largest-remainder rounding; lower ' +
      'wins. Defaults to the position in the list.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateRevenueSplitConfigDto {
  @ApiProperty({ example: 'standard-hub-split' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [RevenueSplitRecipientDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RevenueSplitRecipientDto)
  recipients: RevenueSplitRecipientDto[];
}

export class ReplaceSplitRecipientsDto {
  @ApiProperty({ type: [RevenueSplitRecipientDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RevenueSplitRecipientDto)
  recipients: RevenueSplitRecipientDto[];
}

export class SetSplitConfigActiveDto {
  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class PreviewSplitDto {
  @ApiProperty()
  @IsUUID()
  configId: string;

  @ApiProperty({
    description: 'Amount in minor units to apportion',
    example: 10000,
  })
  @IsInt()
  @Min(0)
  amount: number;
}
