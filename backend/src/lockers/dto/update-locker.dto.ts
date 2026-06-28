import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerSize } from '../enums/locker-size.enum';

export class UpdateLockerDto {
  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsEnum(LockerSize)
  size?: LockerSize;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
