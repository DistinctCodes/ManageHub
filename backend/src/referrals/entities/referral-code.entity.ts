import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('referral_codes')
@Unique(['userId'])
@Unique(['code'])
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 8 })
  code: string;

  @CreateDateColumn()
  createdAt: Date;
}
