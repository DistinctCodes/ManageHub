import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletLedgerEntryType } from '../enums/wallet-ledger-entry-type.enum';

/**
 * Minimal funding rail: a custodial wallet's balance is
 * SUM(CREDIT) - SUM(DEBIT) over this table, recorded as ledger entries
 * rather than real on-chain transfers. A full fiat-to-crypto on/off-ramp
 * is out of scope for this issue (see #1573) — this just makes the
 * custodial balance real enough to demo the payment flows that depend on
 * it.
 */
@Entity('wallet_ledger_entries')
export class WalletLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'wallet_account_id' })
  walletAccountId: string;

  @Column({ type: 'enum', enum: WalletLedgerEntryType })
  type: WalletLedgerEntryType;

  /** Minor units — never a float. */
  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => parseInt(v, 10) },
  })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
