import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // <-- Adjust path as needed
import { Staff } from '../../staff/entities/staff.entity'; // <-- Adjust path as needed
import { TicketStatus } from '../enums/ticket-status.enum';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relation: The user who created the ticket
  @ManyToOne(() => User, (user) => user.supportTickets, { eager: true }) // Assuming 'supportTickets' is on User
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string; // Foreign key

  // Relation: The staff member assigned to the ticket (can be null)
  @ManyToOne(() => Staff, (staff) => staff.assignedTickets, { nullable: true, eager: true }) // Assuming 'assignedTickets' is on Staff
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: Staff;

  @Column({ nullable: true })
  assignedToId: string; // Foreign key
}