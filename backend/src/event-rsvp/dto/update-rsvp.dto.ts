import { PartialType } from '@nestjs/mapped-types';
import { CreateRsvpDto } from './create-rsvp.dto';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { RsvpStatus } from '../entities/event-rsvp.entity';

export class UpdateRsvpDto extends PartialType(CreateRsvpDto) {
  @IsEnum(RsvpStatus)
  @IsOptional()
  status?: RsvpStatus;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  cancellationReason?: string;
}
