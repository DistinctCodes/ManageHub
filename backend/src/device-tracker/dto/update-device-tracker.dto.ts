import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceTrackerDto } from './create-device-tracker.dto';

export class UpdateDeviceTrackerDto extends PartialType(CreateDeviceTrackerDto) {}