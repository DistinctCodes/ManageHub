import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { MinorUnits } from '../utils/minor-units.decorator';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Minor units (e.g. cents) — same convention as Payment#amount',
  })
  @MinorUnits()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
