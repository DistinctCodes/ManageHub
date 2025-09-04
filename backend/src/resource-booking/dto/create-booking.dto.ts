import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @IsString()
  @IsNotEmpty()
  bookedBy: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
