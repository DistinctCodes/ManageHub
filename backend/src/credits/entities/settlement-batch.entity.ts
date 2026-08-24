import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SettlementBatchStatus } from '../enums/settlement-batch-status.enum';
import { SettlementBatchMode } from '../enums/settlement-batch-mode.enum';
import { SettlementPayout } from './settlement-payout.entity';

/**
 * One netting/distribution run (issue #1575). Creating a batch claims a
 * set of ledger entries (see LedgerEntry's two markers) and computes the
 * payouts that must move value off-platform; executing it submits those
 * payouts and only marks the claimed entries settled once the rail
 * confirms them.
 *
 * A batch is therefore always safe to re-execute: every payout carries
 * its own idempotency key, and the claim means a resumed run can never
 * pull the same entries into a second batch.
 */
@Entity('settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SettlementBatchStatus,
    default: SettlementBatchStatus.PENDING,
  })
  status: SettlementBatchStatus;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: SettlementBatchMode })
  mode: SettlementBatchMode;

  @Column({ type: 'uuid', name: 'split_config_id', nullable: true })
  splitConfigId: string | null;

  /** Everything claimed by this batch was created at or before this instant. */
  @Column({ type: 'timestamptz', name: 'period_end' })
  periodEnd: Date;

  /** Net value claimed by this batch, in minor units. */
  @Column({
    type: 'bigint',
    name: 'total_amount',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) =>
        typeof v === 'number' ? v : parseInt(v, 10),
    },
  })
  totalAmount: number;

  @Column({ type: 'int', name: 'claimed_entry_count', default: 0 })
  claimedEntryCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => SettlementPayout, (payout) => payout.batch)
  payouts: SettlementPayout[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
