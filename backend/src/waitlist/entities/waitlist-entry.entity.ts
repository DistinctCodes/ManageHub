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
import { PlanType } from '../../bookings/enums/plan-type.enum';
import { WaitlistStatus } from '../enums/waitlist-status.enum';

@Entity('waitlist_entries')
@Index(['workspaceId'])
@Index(['userId'])
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workspaceId: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: PlanType })
  planType: PlanType;

  @Column({ type: 'date' })
  requestedStartDate: string;

  @Column({ type: 'date', nullable: true })
  requestedEndDate: string | null;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'enum', enum: WaitlistStatus, default: WaitlistStatus.WAITING })
  status: WaitlistStatus;

  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}