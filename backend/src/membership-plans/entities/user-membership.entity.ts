import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MembershipPlan } from './membership-plan.entity';
import { MembershipStatus } from '../enums/membership-status.enum';

@Entity('user_memberships')
@Index(['userId'])
@Index(['status'])
export class UserMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  planId: string;

  @ManyToOne(() => MembershipPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: MembershipPlan;

  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  currentPeriodEnd: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  paystackSubscriptionCode?: string;

  @CreateDateColumn()
  createdAt: Date;
}