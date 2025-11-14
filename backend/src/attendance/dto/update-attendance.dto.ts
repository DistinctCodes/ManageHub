import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsDateString()
  clockOut: string;
}
