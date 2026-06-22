import { IsEnum } from 'class-validator';
import { DeviceStatus } from '../enums/device-status.enum';

export class UpdateDeviceStatusDto {
  @IsEnum(DeviceStatus)
  status: DeviceStatus;
}
