import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerEntryDirection } from '../enums/ledger-entry-direction.enum';

/**
 * Append-only half of a double-entry pair (issue #1575). Never updated
 * except by the two settlement markers below, and never deleted — a
 * correction is a new REVERSAL transaction, not an edit.
 *
 * The two markers are deliberately separate:
 *  - `settlementBatchId` is the CLAIM: this entry belongs to one batch and
 *    can never be claimed by another, which is what makes a crashed batch
 *    job resumable rather than double-paying.
 *  - `settledAt` is the SETTLED marker: set only after the batch's payout
 *    has been confirmed by the rail. A submitted-but-unconfirmed payout
 *    leaves the entry claimed and unsettled, so a failed on-chain leg can
 *    never leave the ledger claiming money already moved.
 */
@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_ledger_entries_transaction_id')
  @Column({ type: 'uuid', name: 'transaction_id' })
  transactionId: string;

  @Index('idx_ledger_entries_account_id')
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'enum', enum: LedgerEntryDirection })
  direction: LedgerEntryDirection;

  /** Always positive minor units; `direction` carries the sign. */
  @Column({
    type: 'bigint',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) =>
        typeof v === 'number' ? v : parseInt(v, 10),
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  /** Claim marker — see the class doc. */
  @Column({ type: 'uuid', name: 'settlement_batch_id', nullable: true })
  settlementBatchId: string | null;

  /** Settled marker — see the class doc. */
  @Column({ type: 'timestamptz', name: 'settled_at', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
