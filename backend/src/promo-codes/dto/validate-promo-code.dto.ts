import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsUUID()
  workspaceId: string;

  @IsInt()
  @Min(0)
  bookingAmount: number;
}
