import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MembershipPlan } from './membership-plan.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity('user_memberships')
@Index(['userId'])
@Index(['planId'])
export class UserMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  planId: string;

  @ManyToOne(() => MembershipPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: MembershipPlan;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}