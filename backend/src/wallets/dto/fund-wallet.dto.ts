import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MinorUnits } from '../../payments/utils/minor-units.decorator';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to credit, in minor units (e.g. stroops)',
    example: 1000000,
  })
  @MinorUnits()
  amount: number;

  @ApiProperty({ description: 'Why this wallet is being funded — audited' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
