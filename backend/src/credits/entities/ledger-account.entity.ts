import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LedgerAccountKind } from '../enums/ledger-account-kind.enum';

/** Shared minor-units transformer — bigint arrives from pg as a string. */
const MINOR_UNITS = {
  to: (v: number) => v,
  from: (v: string | number) => (typeof v === 'number' ? v : parseInt(v, 10)),
};

/**
 * One account in the double-entry credit ledger (issue #1575): a user's
 * spendable credit balance, or a system account (platform fee, hub
 * operator payable, treasury clearing).
 *
 * `balance` is materialized here rather than recomputed from
 * ledger_entries on every read. That is deliberate: the spend path is
 * high-frequency and low-value, so an overdraft check must be O(1), and
 * the row is what a charge takes a `FOR UPDATE` lock on — the lock that
 * makes concurrent charges against the same account safe. The append-only
 * entries remain the source of truth; LedgerService.checkIntegrity()
 * re-derives the balance from them and reports any drift.
 */
@Entity('ledger_accounts')
@Index('uq_ledger_accounts_owned', ['kind', 'ownerId', 'currency'], {
  unique: true,
  where: `"owner_id" IS NOT NULL`,
})
@Index('uq_ledger_accounts_system', ['kind', 'currency'], {
  unique: true,
  where: `"owner_id" IS NULL`,
})
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LedgerAccountKind })
  kind: LedgerAccountKind;

  /**
   * The user / hub / referrer this account belongs to. NULL for a
   * singleton system account (one per kind per currency).
   */
  @Index('idx_ledger_accounts_owner_id')
  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  ownerId: string | null;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  /** SUM(CREDIT) - SUM(DEBIT) over this account's entries. May be negative. */
  @Column({ type: 'bigint', default: 0, transformer: MINOR_UNITS })
  balance: number;

  /**
   * How far below zero a charge may take this account, in minor units.
   * 0 (the default) means charges are rejected the moment they would
   * overdraw — see CreditsService for the documented policy.
   */
  @Column({
    type: 'bigint',
    name: 'overdraft_limit',
    default: 0,
    transformer: MINOR_UNITS,
  })
  overdraftLimit: number;

  /**
   * Where this account's balance goes when it is settled off-platform
   * (a Stellar address for the #1574 rail). NULL means the balance never
   * leaves the ledger — nothing to pay out.
   */
  @Column({
    type: 'varchar',
    name: 'external_payout_address',
    nullable: true,
  })
  externalPayoutAddress: string | null;

  /** A frozen account rejects charges and payouts but still accepts credits. */
  @Column({ type: 'boolean', default: false })
  frozen: boolean;

  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
