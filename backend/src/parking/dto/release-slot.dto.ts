import { IsNotEmpty, IsString } from 'class-validator';

export class ReleaseSlotDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;
}
