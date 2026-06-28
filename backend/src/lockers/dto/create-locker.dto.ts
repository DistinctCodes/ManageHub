import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LockerSize } from '../enums/locker-size.enum';

export class CreateLockerDto {
  @IsString()
  @IsNotEmpty()
  lockerNumber: string;

  @IsString()
  @IsNotEmpty()
  floor: string;

  @IsEnum(LockerSize)
  size: LockerSize;

  @IsOptional()
  @IsString()
  notes?: string;
}
