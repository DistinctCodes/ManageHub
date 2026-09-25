import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReconciliationRunOutcome = 'succeeded' | 'failed';

/**
 * Immutable-ish audit record for one scheduled reconciliation pass. The
 * counters are copied from ReconciliationSummary when the pass completes;
 * a row remains queryable with nullable completion fields if the process
 * fails before it can finish the pass, and `error` captures that failure.
 */
@Entity('reconciliation_runs')
@Index('idx_reconciliation_runs_started_at', ['startedAt'])
@Index('idx_reconciliation_runs_outcome', ['outcome'])
export class ReconciliationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number | null;

  @Column({ type: 'int', name: 'candidates', default: 0 })
  candidates: number;

  @Column({ type: 'int', name: 'resolved', default: 0 })
  resolved: number;

  @Column({ type: 'int', name: 'pending', default: 0 })
  pending: number;

  @Column({ type: 'int', name: 'provider_errors', default: 0 })
  providerErrors: number;

  @Column({
    type: 'int',
    name: 'escalated_to_manual_review',
    default: 0,
  })
  escalatedToManualReview: number;

  @Column({ type: 'int', name: 'expired_swept', default: 0 })
  expiredSwept: number;

  @Column({ type: 'text', name: 'outcome', nullable: true })
  outcome: ReconciliationRunOutcome | null;

  @Column({ type: 'text', name: 'error', nullable: true })
  error: string | null;

  /** Additional run context such as cap configuration and escalation counts. */
  @Column({ type: 'jsonb', name: 'details', nullable: true })
  details: Record<string, unknown> | null;
}
