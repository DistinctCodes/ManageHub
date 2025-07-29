import { PartialType } from '@nestjs/mapped-types';
import { CreateBroadcastDto } from './create-broadcast.dto';

export class UpdateBroadcastDto extends PartialType(CreateBroadcastDto) {}
