import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  staffId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  position: string;

  @IsDateString()
  hireDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
