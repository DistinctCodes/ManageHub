import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RevenueSplitRecipient } from './revenue-split-recipient.entity';

/**
 * A reusable multi-party distribution rule (issue #1575) — attachable to
 * a Payment or to a settlement batch, and computed at the moment value
 * actually moves rather than baked in when it was configured.
 *
 * Its recipients' basis points must sum to exactly 10000. That is
 * validated at CONFIGURATION time (RevenueSplitService.createConfig /
 * replaceRecipients) so a broken split is a 400 on the admin's request,
 * not a surprise discovered halfway through a settlement run.
 */
@Entity('revenue_split_configs')
@Index('uq_revenue_split_configs_name', ['name'], { unique: true })
export class RevenueSplitConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** An inactive config is rejected when something tries to compute with it. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => RevenueSplitRecipient, (recipient) => recipient.config)
  recipients: RevenueSplitRecipient[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
