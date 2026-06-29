import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}
export enum RewardType {
  DISCOUNT = 'discount',
  CREDIT = 'credit',
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column({ type: 'uuid', nullable: true })
  referredUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  @Column()
  code: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ type: 'enum', enum: RewardType, nullable: true })
  rewardType: RewardType;

  @Column({ type: 'int', nullable: true })
  rewardValue: number;

  @Column({ type: 'timestamptz', nullable: true })
  awardedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
