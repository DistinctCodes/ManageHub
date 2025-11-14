import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  staffId: string;

  @IsNotEmpty()
  @IsDateString()
  clockIn: string;
}
