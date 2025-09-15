import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateEventFeedbackDto {
  @IsString()
  eventId: string;

  @IsString()
  @IsOptional()
  rsvpId?: string;

  @IsString()
  @Length(1, 255)
  attendeeName: string;

  @IsEmail()
  attendeeEmail: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  contentRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  organizationRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  venueRating?: number;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  comments?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  suggestions?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  whatWorkedWell?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  whatCouldImprove?: string;

  @IsBoolean()
  @IsOptional()
  wouldRecommend?: boolean;

  @IsBoolean()
  @IsOptional()
  wouldAttendAgain?: boolean;

  @IsObject()
  @IsOptional()
  customResponses?: Record<string, any>;
}