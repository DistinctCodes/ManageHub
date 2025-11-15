import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportTicketDto } from './create-support-ticket.dto';
import { TicketStatus } from '../enums/ticket-status.enum';

export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string; // The ID of the staff member to assign
}