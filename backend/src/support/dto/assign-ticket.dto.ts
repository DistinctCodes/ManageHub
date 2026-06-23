import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketPriority } from '../entities/support-ticket.entity';

export class AssignTicketDto {
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;
}
