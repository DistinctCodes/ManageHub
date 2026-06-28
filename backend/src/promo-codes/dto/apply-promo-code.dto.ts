import { IsString, IsUUID, IsInt, Min } from 'class-validator';

export class ApplyPromoCodeDto {
  @IsString()
  code: string;

  @IsUUID()
  bookingId: string;

  @IsInt()
  @Min(0)
  bookingAmount: number;
}
