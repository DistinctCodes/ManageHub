import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Minor units (e.g. cents) — same convention as Payment#amount',
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
