import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;
}
