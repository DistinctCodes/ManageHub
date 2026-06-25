import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DeviceType } from '../enums/device-type.enum';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
