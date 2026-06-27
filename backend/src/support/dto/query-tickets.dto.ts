import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../entities/support-ticket.entity';

export class QueryTicketsDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}
