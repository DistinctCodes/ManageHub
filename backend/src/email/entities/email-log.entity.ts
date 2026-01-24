import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  COMPLAINED = 'complained',
}

export enum EmailType {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  PAYMENT_RECEIPT = 'payment_receipt',
  CHECK_IN_SUMMARY = 'check_in_summary',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  ADMIN_NOTIFICATION = 'admin_notification',
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
}

@Entity('email_logs')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['emailType', 'createdAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column()
  to: string;

  @Column({ nullable: true })
  from: string;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent: string;

  @Column({
    type: 'enum',
    enum: EmailType,
    default: EmailType.TRANSACTIONAL,
  })
  emailType: EmailType;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.QUEUED,
  })
  status: EmailStatus;

  @Column({ nullable: true })
  messageId: string;

  @Column({ nullable: true })
  providerMessageId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    filename: string;
    path?: string;
    content?: string;
    contentType?: string;
  }>;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  bouncedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  providerResponse: string;

  @Column({ default: 0 })
  openCount: number;

  @Column({ default: 0 })
  clickCount: number;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
