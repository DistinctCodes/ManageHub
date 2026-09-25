import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to credit, in minor units (e.g. stroops)',
    example: 1000000,
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Why this wallet is being funded — audited' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
