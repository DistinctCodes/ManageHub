import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only audit trail for structured administrator actions that are not
 * otherwise covered by a domain audit log (e.g. settlement batch recovery,
 * revenue-split activation, manual payment resolution).
 */
@Entity('admin_action_logs')
export class AdminActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The admin user who performed the action. */
  @Column({ type: 'uuid', name: 'actor_id' })
  actorId: string;

  /** Machine-readable action identifier, e.g. "settlement_batch_execute". */
  @Column({ type: 'varchar', length: 64 })
  action: string;

  /** Which kind of entity the action targeted, e.g. "SettlementBatch". */
  @Column({ type: 'varchar', length: 64, name: 'target_type' })
  targetType: string;

  @Index('idx_admin_action_logs_target')
  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId: string | null;

  /** Free-form context (a human reason where one was required). */
  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
