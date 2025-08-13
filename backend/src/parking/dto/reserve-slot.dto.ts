import { IsNotEmpty, IsString } from 'class-validator';

export class ReserveSlotDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  staffId: string;
}
