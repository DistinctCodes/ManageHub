import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  Length,
  IsPhoneNumber,
} from 'class-validator';
import { RsvpSource } from '../entities/event-rsvp.entity';

export class CreateRsvpDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  userId?: string;

  @IsString()
  @Length(1, 255)
  attendeeName: string;

  @IsEmail()
  attendeeEmail: string;

  @IsString()
  @IsOptional()
  attendeePhone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  attendeeOrganization?: string;

  @IsEnum(RsvpSource)
  @IsOptional()
  source?: RsvpSource = RsvpSource.WEB;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  specialRequests?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  dietaryRestrictions?: string;

  @IsObject()
  @IsOptional()
  customResponses?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isVip?: boolean = false;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  notes?: string;
}