import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignStatus } from '../enums/campaign-status.enum';
import { CampaignSegment } from '../enums/campaign-segment.enum';

@Entity('email_campaigns')
export class EmailCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  bodyHtml: string;

  @Column({ type: 'enum', enum: CampaignSegment, default: CampaignSegment.ALL })
  targetSegment: CampaignSegment;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ default: 0 })
  recipientCount: number;

  @Column('uuid')
  createdByAdminId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdByAdminId' })
  createdByAdmin: User;

  @CreateDateColumn()
  createdAt: Date;
}
