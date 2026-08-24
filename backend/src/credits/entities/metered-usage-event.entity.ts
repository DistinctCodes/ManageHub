import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeteredResource } from '../enums/metered-resource.enum';

/**
 * The audit record for one metered usage event that charged the credit
 * ledger (issue #1575) — the call site that exercises the spend path end
 * to end without ever touching a payment rail.
 *
 * `usageReference` is the caller's own natural key for the event (a
 * session id, a print job id) and is unique: a retried delivery of the
 * same usage event records once and charges once.
 */
@Entity('metered_usage_events')
@Index('uq_metered_usage_events_usage_reference', ['usageReference'], {
  unique: true,
})
export class MeteredUsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_metered_usage_events_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: MeteredResource })
  resource: MeteredResource;

  /** Minutes, pages, ... — whatever this resource meters. */
  @Column({ type: 'int' })
  units: number;

  /** Minor units per unit. */
  @Column({
    type: 'bigint',
    name: 'unit_price',
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) =>
        typeof v === 'number' ? v : parseInt(v, 10),
    },
  })
  unitPrice: number;

  /** units * unitPrice — stored so a later repricing cannot rewrite history. */
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

  @Column({ type: 'varchar', name: 'usage_reference' })
  usageReference: string;

  /** The CHARGE transaction this event posted. */
  @Column({ type: 'uuid', name: 'ledger_transaction_id' })
  ledgerTransactionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
