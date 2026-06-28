import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CampaignSegment } from '../enums/campaign-segment.enum';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsEnum(CampaignSegment)
  targetSegment: CampaignSegment;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
