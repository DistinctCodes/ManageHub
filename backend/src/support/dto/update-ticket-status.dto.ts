import { IsEnum } from 'class-validator';
import { TicketStatus } from '../entities/support-ticket.entity';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
