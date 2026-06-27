import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from './support-ticket.entity';

@Entity('ticket_replies')
export class TicketReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => SupportTicket, (t) => t.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_staff_reply', default: false })
  isStaffReply: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
