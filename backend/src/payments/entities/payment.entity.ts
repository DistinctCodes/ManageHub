import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentRail } from '../enums/payment-rail.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';

@Entity('payments')
@Index(['userId', 'idempotencyKey'], { unique: true })
@Index('uq_payments_booking_id_non_terminal', ['bookingId'], {
  unique: true,
  where: `"status" IN ('INITIATED', 'AWAITING_CONFIRMATION')`,
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /** Minor units (e.g. cents / stroops) — never a float. */
  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => parseInt(v, 10) },
  })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: PaymentRail })
  rail: PaymentRail;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', name: 'provider_reference', nullable: true })
  providerReference: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', name: 'idempotency_key' })
  idempotencyKey: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** TTL for INITIATED payments; a later reconciliation job sweeps on this. */
  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  // ── Reconciliation (issue #1572) ────────────────────────────────────────

  /** Set alongside a FAILED or EXPIRED status — WHY, not just WHAT. */
  @Column({
    type: 'enum',
    enum: PaymentFailureReason,
    name: 'failure_reason',
    nullable: true,
  })
  failureReason: PaymentFailureReason | null;

  /** Every reconciliation pass that touched this payment, resolved or not — drives backoff scheduling. */
  @Column({ type: 'int', name: 'reconciliation_attempts', default: 0 })
  reconciliationAttempts: number;

  /**
   * Consecutive reconciliation passes where the provider itself was
   * unreachable (not "provider said pending"). Reset to 0 the moment a
   * verify call successfully reaches the provider again. Used to withhold
   * MANUAL_REVIEW escalation during a provider outage — see
   * ReconciliationService.
   */
  @Column({ type: 'int', name: 'provider_error_streak', default: 0 })
  providerErrorStreak: number;

  @Column({ type: 'timestamptz', name: 'last_reconciled_at', nullable: true })
  lastReconciledAt: Date | null;

  /** Reason text for a MANUAL_REVIEW escalation or an admin resolve/void action — audited. */
  @Column({ type: 'text', name: 'manual_review_reason', nullable: true })
  manualReviewReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
