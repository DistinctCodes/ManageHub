import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { PlanType } from '../enums/plan-type.enum';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity('bookings')
@Index(['userId'])
@Index(['workspaceId'])
@Index(['status'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'enum', enum: PlanType })
  planType: PlanType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  /** Total booking amount in kobo (workspace cost + resource add-ons) */
  @Column({ type: 'bigint' })
  totalAmount: number;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'int', default: 1 })
  seatCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /** Soroban escrow ID for MONTHLY/QUARTERLY/YEARLY bookings */
  @Column({ nullable: true })
  sorobanEscrowId: string;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ default: false })
  isGuestBooking: boolean;

  @Column({ type: 'jsonb', nullable: true })
  guestInfo: { name: string; email: string; phone: string } | null;

  /**
   * Resource add-on IDs selected at booking time.
   * Each UUID references a Resource entity.
   */
  @Column({ type: 'jsonb', nullable: true, default: [] })
  resourceIds: string[];

  /** Total cost of selected resource add-ons in kobo */
  @Column({ type: 'int', default: 0 })
  resourcesTotalKobo: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}