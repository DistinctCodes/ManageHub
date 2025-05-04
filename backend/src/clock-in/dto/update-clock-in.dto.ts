import { PartialType } from '@nestjs/mapped-types';
import { CreateClockinDto } from './create-clock-in.dto';

export class UpdateClockInDto extends PartialType(CreateClockinDto) {}
