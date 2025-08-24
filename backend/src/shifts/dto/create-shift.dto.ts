import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ShiftStatus } from '../entities/shift.entity';

export class CreateShiftDto {
  @IsUUID()
  staffId: string;

  @IsUUID()
  locationId: string;

  @IsDateString()
  shiftDate: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsNumber()
  breakDuration?: number;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  hoursWorked?: number;
}
