import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { StaffRole } from '../entities/staff.entity';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'shiftStartTime must be in HH:MM format (e.g., 09:00)',
  })
  shiftStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'shiftEndTime must be in HH:MM format (e.g., 17:30)',
  })
  shiftEndTime?: string;
}
