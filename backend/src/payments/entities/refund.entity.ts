import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only refund ledger (issue #1572) — a Payment can have many Refund
 * rows (partial refunds), so "amount refunded" is always
 * SUM(refunds.amount) for a payment, never a single boolean on Payment
 * itself. Presence of a row here means the refund was accepted into the
 * ledger atomically (see RefundsService); there is no separate pending
 * state because provider-side execution is best-effort/logged after the
 * ledger commit, not modeled as its own lifecycle in this MVP.
 */
@Entity('payment_refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  /** Minor units — same convention as Payment#amount. */
  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => parseInt(v, 10) },
  })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  /** Null for a system/automated refund; the admin's user id otherwise. */
  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
