import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty({ description: 'The booking ID to pay for' })
  @IsUUID()
  bookingId: string;
}
