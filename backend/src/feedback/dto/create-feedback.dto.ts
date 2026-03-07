import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { FeedbackType } from '../enums/feedback-type.enum';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType, { message: 'Type must be: bug, feature_request, general, or rating' })
  type: FeedbackType;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;
}
