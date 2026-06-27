import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PlanType } from '../../bookings/enums/plan-type.enum';

export class CreateWaitlistDto {
  @IsUUID()
  workspaceId: string;

  @IsEnum(PlanType)
  planType: PlanType;

  @IsDateString()
  requestedStartDate: string;

  @IsOptional()
  @IsDateString()
  requestedEndDate?: string;
}