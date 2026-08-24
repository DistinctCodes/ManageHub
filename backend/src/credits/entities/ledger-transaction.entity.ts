import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerTransactionKind } from '../enums/ledger-transaction-kind.enum';

/**
 * Groups the debit/credit entries that must balance to zero together
 * (issue #1575). `reference` is the idempotency key for the whole
 * transaction and is UNIQUE: a replayed charge, a re-run settlement pass
 * or a resumed batch job all collide on it and get the original
 * transaction back instead of posting a duplicate.
 */
@Entity('ledger_transactions')
@Index('uq_ledger_transactions_reference', ['reference'], { unique: true })
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LedgerTransactionKind })
  kind: LedgerTransactionKind;

  /**
   * Caller-supplied natural key, e.g. `charge:usage:<usageId>`,
   * `top-up:payment:<paymentId>`, `settlement:<batchId>:<payoutId>`.
   */
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  /** Sum of one side of the transaction (debits == credits == this). */
  @Column({
    type: 'bigint',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) =>
        typeof v === 'number' ? v : parseInt(v, 10),
    },
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Null for a system-initiated transaction; the acting user otherwise. */
  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
