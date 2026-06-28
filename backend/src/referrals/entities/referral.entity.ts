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
import { ReferralStatus } from '../enums/referral-status.enum';
import { RewardType } from '../enums/reward-type.enum';

@Entity('referrals')
@Index(['referrerId'])
@Index(['referredUserId'])
@Index(['referredUserId', 'status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column('uuid')
  referredUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ type: 'enum', enum: RewardType, nullable: true })
  rewardType: RewardType | null;

  @Column({ type: 'int', nullable: true })
  rewardValue: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  awardedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
