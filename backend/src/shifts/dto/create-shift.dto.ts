import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  staffUserId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
