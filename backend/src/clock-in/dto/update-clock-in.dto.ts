import { PartialType } from '@nestjs/mapped-types';
import { CreateClockInDto } from './create-clock-in.dto';

export class UpdateClockInDto extends PartialType(CreateClockInDto) {}
