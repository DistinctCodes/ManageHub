import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadStatus } from '../enums/lead-status.enum';

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  assignedToStaffId?: string;
}
