import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

export enum ReferralStatus {
  SIGNED_UP = 'SIGNED_UP',
  QUALIFIED = 'QUALIFIED',
  REWARDED = 'REWARDED',
}

@Entity('referrals')
@Unique(['referredUserId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referrerUserId: string;

  @Column()
  referredUserId: string;

  @Column()
  codeUsed: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.SIGNED_UP })
  status: ReferralStatus;

  @Column({ type: 'timestamp', nullable: true })
  qualifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
