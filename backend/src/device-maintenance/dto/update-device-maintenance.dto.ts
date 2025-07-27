import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceDto } from './create-device.dto';

export class UpdateDeviceMaintenanceDto extends PartialType(CreateDeviceDto) {}
