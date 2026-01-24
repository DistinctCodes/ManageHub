import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('email_preferences')
@Index(['userId'], { unique: true })
export class EmailPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({ default: true })
  enableMarketingEmails: boolean;

  @Column({ default: true })
  enableTransactionalEmails: boolean;

  @Column({ default: true })
  enableNotificationEmails: boolean;

  @Column({ default: true })
  enableSecurityEmails: boolean;

  @Column({ default: true })
  enableProductUpdates: boolean;

  @Column({ default: true })
  enableWeeklySummary: boolean;

  @Column({ default: true })
  enablePromotions: boolean;

  @Column({ default: true })
  enableNewsletters: boolean;

  @Column({ default: false })
  unsubscribedFromAll: boolean;

  @Column({ nullable: true })
  unsubscribeToken: string;

  @Column({ type: 'timestamptz', nullable: true })
  unsubscribedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  customPreferences: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
