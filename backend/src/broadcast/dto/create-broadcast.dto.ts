import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';

export class CreateBroadcastDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string; // ISO 8601 format
}
