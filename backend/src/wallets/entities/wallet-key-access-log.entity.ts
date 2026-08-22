import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only audit trail: one row per decrypt operation performed by
 * KeyCustodyService, regardless of outcome. Never contains key material.
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

  /** Why the key was decrypted — e.g. 'custodial-funding-signature'. */
  @Column({ type: 'varchar' })
  reason: string;

  @Column({ type: 'boolean' })
  successful: boolean;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date;
}
