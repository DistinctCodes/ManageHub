import { IsString, IsNumber, IsEmail, IsDateString, IsOptional } from 'class-validator';

export class CheckinDataDto {
  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsEmail()
  email: string;

  @IsString()
  department: string;

  @IsDateString()
  checkInDate: string;

  @IsString()
  checkInTime: string;

  @IsNumber()
  heartRate: number;

  @IsNumber()
  systolicBP: number;

  @IsNumber()
  diastolicBP: number;

  @IsNumber()
  temperature: number;

  @IsNumber()
  oxygenSaturation: number;

  @IsNumber()
  weight: number;

  @IsNumber()
  height: number;

  @IsNumber()
  bmi: number;

  @IsNumber()
  steps: number;

  @IsNumber()
  sleepHours: number;

  @IsNumber()
  stressLevel: number;

  @IsString()
  healthStatus: string;

  @IsOptional()
  @IsString()
  notes?: string;
}