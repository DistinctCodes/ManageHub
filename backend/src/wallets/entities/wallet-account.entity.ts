import {
  Column,
  CreateDateColumn,
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
}
