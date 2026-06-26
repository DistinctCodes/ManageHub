import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from './entities/support-ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/userRoles.enum';
import { UsersService } from '../users/providers/users.service';


@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketReply)
    private readonly replyRepo: Repository<TicketReply>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  async createTicket(dto: CreateTicketDto, user: User): Promise<SupportTicket> {
    const ticket = this.ticketRepo.create({
      ...dto,
      userId: user.id,
      status: TicketStatus.OPEN,
    });
    const saved = await this.ticketRepo.save(ticket);

    // Notify admins of new ticket
    const admins = await this.usersService.findAllAdmins();
    await Promise.allSettled(
      admins.map((admin) =>
        this.emailService.sendTemplateEmail(
          admin.email,
          `New Support Ticket: ${dto.subject}`,
          'contact-notification',
          {
            fullName: admin.firstname,
            email: user.email,
            subject: dto.subject,
            message: dto.description,
          },
        ),
      ),
    );

    return saved;
  }

  async getMyTickets(user: User): Promise<SupportTicket[]> {
    return this.ticketRepo.find({
      where: { userId: user.id },
      relations: ['replies'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTicket(id: string, user: User): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['replies', 'replies.user', 'user', 'assignedTo'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const isOwner = ticket.userId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied');

    return ticket;
  }

  async addReply(
    id: string,
    dto: CreateReplyDto,
    user: User,
  ): Promise<TicketReply> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const isOwner = ticket.userId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied');

    const reply = this.replyRepo.create({
      ticketId: id,
      userId: user.id,
      message: dto.message,
      isStaffReply: isAdmin,
    });
    const saved = await this.replyRepo.save(reply);

    // Email member when admin replies
    if (isAdmin && ticket.user) {
      await this.emailService.sendTemplateEmail(
        ticket.user.email,
        `Update on your ticket: ${ticket.subject}`,
        'contact-confirmation',
        {
          fullName: `${ticket.user.firstname} ${ticket.user.lastname}`,
          subject: ticket.subject,
        },
      );
    }

    return saved;
  }

  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
  ): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = dto.status;
    return this.ticketRepo.save(ticket);
  }

  async assignTicket(id: string, dto: AssignTicketDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (dto.assignedToId !== undefined) ticket.assignedToId = dto.assignedToId;
    if (dto.priority !== undefined) ticket.priority = dto.priority;
    return this.ticketRepo.save(ticket);
  }

  async getAllTickets(query: QueryTicketsDto): Promise<SupportTicket[]> {
    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .orderBy('ticket.createdAt', 'DESC');

    if (query.status) qb.andWhere('ticket.status = :status', { status: query.status });
    if (query.category) qb.andWhere('ticket.category = :category', { category: query.category });
    if (query.priority) qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    if (query.assignedToId) qb.andWhere('ticket.assignedToId = :assignedToId', { assignedToId: query.assignedToId });

    return qb.getMany();
  }
}
