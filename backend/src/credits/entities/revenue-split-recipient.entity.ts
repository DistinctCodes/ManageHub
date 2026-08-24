import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RevenueSplitConfig } from './revenue-split-config.entity';

/**
 * One share of a RevenueSplitConfig (issue #1575). Exactly one of
 * `accountId` (distribute internally as ledger entries) or
 * `externalAddress` (pay out off-platform over the #1574 rail) is set —
 * that choice is what decides whether this share ever leaves the ledger.
 *
 * `sortOrder` is not cosmetic: it is the documented tie-breaker for
 * largest-remainder rounding, so an identical config over an identical
 * amount always allocates the remainder to the same recipients.
 */
@Entity('revenue_split_recipients')
export class RevenueSplitRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_revenue_split_recipients_config_id')
  @Column({ type: 'uuid', name: 'config_id' })
  configId: string;

  @ManyToOne(() => RevenueSplitConfig, (config) => config.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'config_id' })
  config: RevenueSplitConfig;

  /** Human-readable share name, e.g. "platform fee", "hub operator". */
  @Column({ type: 'varchar' })
  label: string;

  /** 1..10000; a config's recipients must sum to exactly 10000. */
  @Column({ type: 'int', name: 'basis_points' })
  basisPoints: number;

  /** Internal recipient: a ledger account credited with this share. */
  @Column({ type: 'uuid', name: 'account_id', nullable: true })
  accountId: string | null;

  /** External recipient: an on-chain address paid this share. */
  @Column({ type: 'varchar', name: 'external_address', nullable: true })
  externalAddress: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;
}
