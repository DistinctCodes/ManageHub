import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString } from 'class-validator';

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
  reason: string;
}
