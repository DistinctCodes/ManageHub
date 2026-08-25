import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SettlementPayoutStatus } from '../enums/settlement-payout-status.enum';
import { SettlementBatch } from './settlement-batch.entity';

/**
 * One recipient's slice of a settlement batch (issue #1575).
 *
 * `idempotencyKey` is unique and derived deterministically from the batch
 * and the recipient, so re-executing a batch after a crash hands the
 * payout rail the same key and can never double-pay: the rail dedupes on
 * it, and this row's own status guards the ledger side.
 */
@Entity('settlement_payouts')
@Index('uq_settlement_payouts_idempotency_key', ['idempotencyKey'], {
  unique: true,
})
export class SettlementPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_settlement_payouts_batch_id')
  @Column({ type: 'uuid', name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => SettlementBatch, (batch) => batch.payouts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: SettlementBatch;

  @Column({ type: 'varchar' })
  label: string;

  /**
   * The ledger account this payout draws down. Set for both internal and
   * external payouts — an external payout still has to debit the account
   * whose balance left the platform.
   */
  @Column({ type: 'uuid', name: 'account_id', nullable: true })
  accountId: string | null;

  /** Set for an off-platform payout; NULL for an internal ledger-only share. */
  @Column({ type: 'varchar', name: 'external_address', nullable: true })
  externalAddress: string | null;

  /** NULL in NET_PAYABLE mode — that mode nets, it does not apportion. */
  @Column({ type: 'int', name: 'basis_points', nullable: true })
  basisPoints: number | null;

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

  @Column({
    type: 'enum',
    enum: SettlementPayoutStatus,
    default: SettlementPayoutStatus.PENDING,
  })
  status: SettlementPayoutStatus;

  @Column({ type: 'varchar', name: 'idempotency_key' })
  idempotencyKey: string;

  /** On-chain reference from the #1574 rail (the escrow id it derives). */
  @Column({ type: 'varchar', name: 'on_chain_reference', nullable: true })
  onChainReference: string | null;

  /** The ledger transaction this payout posted once it was confirmed. */
  @Column({ type: 'uuid', name: 'ledger_transaction_id', nullable: true })
  ledgerTransactionId: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
