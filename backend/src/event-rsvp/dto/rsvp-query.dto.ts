import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { RsvpStatus } from '../entities/event-rsvp.entity';

export class RsvpQueryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsEnum(RsvpStatus)
  @IsOptional()
  status?: RsvpStatus;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  attendeeEmail?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  isVip?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
