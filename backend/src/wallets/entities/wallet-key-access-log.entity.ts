import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only security audit trail: one row per key-access attempt and
 * wallet-account lifecycle event (including a logical soft deletion),
 * regardless of outcome. Never contains key material and intentionally has
 * no `deletedAt` column: hiding an audit row would defeat the retention and
 * compliance purpose of this table.
 */
@Entity('wallet_key_access_log')
export class WalletKeyAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'wallet_account_id' })
  walletAccountId: string;

  /** e.g. 'SYSTEM' for an automated signing call, or the acting admin's user id. */
  @Column({ type: 'varchar', name: 'actor' })
  actor: string;

  /**
   * Why the key was accessed or the wallet was retired — e.g. 'account closed'.
   */
  @Column({ type: 'varchar' })
  reason: string;

  @Column({ type: 'boolean' })
  successful: boolean;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date;
}
