import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TicketCategory } from '../entities/support-ticket.entity';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;
}
