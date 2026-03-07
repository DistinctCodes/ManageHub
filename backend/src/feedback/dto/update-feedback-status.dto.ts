import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FeedbackStatus } from '../enums/feedback-status.enum';

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus, { message: 'Status must be: open, in_review, resolved, or closed' })
  status: FeedbackStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
