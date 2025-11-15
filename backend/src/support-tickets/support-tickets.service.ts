import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { User } from '../../users/entities/user.entity'; // <-- Adjust path
import { Staff } from '../../staff/entities/staff.entity'; // <-- Adjust path

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepository: Repository<SupportTicket>,

    // Inject Staff repository to validate staff assignment
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async create(
    createDto: CreateSupportTicketDto,
    user: User,
  ): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create({
      ...createDto,
      createdBy: user,
    });
    return this.ticketRepository.save(ticket);
  }

  async findAll(): Promise<SupportTicket[]> {
    return this.ticketRepository.find({
      relations: ['createdBy', 'assignedTo'],
    });
  }

  async findOne(id: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID #${id} not found`);
    }
    return ticket;
  }

  async update(
    id: string,
    updateDto: UpdateSupportTicketDto,
  ): Promise<SupportTicket> {
    const ticket = await this.findOne(id); // Uses the validation from findOne

    let assignedTo: Staff | null = ticket.assignedTo;

    // If assignedToId is provided, find the staff member
    if (updateDto.assignedToId) {
      assignedTo = await this.staffRepository.findOneBy({
        id: updateDto.assignedToId,
      });
      if (!assignedTo) {
        throw new NotFoundException(
          `Staff member with ID #${updateDto.assignedToId} not found`,
        );
      }
    }

    // Prepare data for update, excluding the ID property
    const { assignedToId, ...restOfDto } = updateDto;
    
    // Merge the changes
    this.ticketRepository.merge(ticket, restOfDto, { assignedTo });

    return this.ticketRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ticketRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Support ticket with ID #${id} not found`);
    }
  }
}