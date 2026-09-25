import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WalletCustodyType } from '../enums/wallet-custody-type.enum';
import { WalletStatus } from '../enums/wallet-status.enum';

/**
 * One row per user. No secret material lives on this table — see
 * WalletKeyMaterial for encrypted custodial key storage, kept in a
 * separate table so a query/export of this one can never leak a key.
 *
 * `deletedAt` is deliberately limited to this account record, which is
 * the user-facing wallet that a delete targets. The child tables
 * (`WalletLedgerEntry`, `WalletKeyAccessLog`, `WalletKeyMaterial`, and
 * `WalletLinkChallenge`) intentionally do not gain a soft-delete flag:
 * ledger entries and access logs are append-only financial/audit facts, and
 * allowing one to disappear would defeat double-entry auditability and
 * compliance history. The user and external-address unique indexes also
 * intentionally continue to include tombstoned rows; WalletsService looks
 * at those rows only for an explicit idempotent revival, then clears the
 * marker before the account is used again.
 */
@Entity('wallet_accounts')
@Index('uq_wallet_accounts_user_id', ['userId'], { unique: true })
@Index('uq_wallet_accounts_external_address', ['address'], {
  unique: true,
  where: `"custody_type" = 'EXTERNAL'`,
})
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'enum', enum: WalletCustodyType, name: 'custody_type' })
  custodyType: WalletCustodyType;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.PENDING,
  })
  status: WalletStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Logical deletion marker for the wallet account. The row and its unique
   * indexes remain in place; services hide it from active-wallet reads and
   * may explicitly revive it during idempotent provisioning.
   */
  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt: Date | null;
}
