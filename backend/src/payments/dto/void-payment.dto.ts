import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoidPaymentDto {
  @ApiProperty({ description: 'Required — audited alongside the void action' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
