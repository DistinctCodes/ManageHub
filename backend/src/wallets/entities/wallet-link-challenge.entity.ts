import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Single-use nonce issued for the non-custodial challenge-response linking
 * flow. `consumedAt` is set atomically (an UPDATE ... WHERE consumed_at IS
 * NULL) the moment a challenge is used, so a captured-and-replayed
 * signature can never link twice — see WalletsService.verifyAndLinkExternalWallet.
 */
@Entity('wallet_link_challenges')
export class WalletLinkChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index('uq_wallet_link_challenges_nonce', { unique: true })
  @Column({ type: 'varchar' })
  nonce: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
