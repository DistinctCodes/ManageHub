import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseCreditsDto {
  @ApiProperty({ description: 'The credit pack ID to purchase' })
  @IsUUID()
  creditPackId: string;
}
