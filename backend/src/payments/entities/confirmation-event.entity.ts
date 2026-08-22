import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConfirmationSource } from '../enums/confirmation-source.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

/**
 * Append-only audit trail of every confirmation event this pipeline ever
 * received — webhook or verify-on-return — regardless of whether it ended
 * up changing anything. This is what a later observability issue surfaces
 * (see issue #1571): duplicate deliveries, out-of-order/conflicting events,
 * forged signatures, and events for a payment that couldn't be found must
 * all show up here, not just the ones that actually moved a Payment.
 */
@Entity('payment_confirmation_events')
export class ConfirmationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Null when the event's providerReference matched no known Payment. */
  @Index()
  @Column({ type: 'uuid', name: 'payment_id', nullable: true })
  paymentId: string | null;

  @Column({ type: 'varchar', name: 'provider_reference', nullable: true })
  providerReference: string | null;

  @Column({ type: 'enum', enum: ConfirmationSource })
  source: ConfirmationSource;

  /** sha256 of the raw payload — never the payload itself. */
  @Column({ type: 'varchar', name: 'raw_payload_hash' })
  rawPayloadHash: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus: PaymentStatus | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'resulting_status',
    nullable: true,
  })
  resultingStatus: PaymentStatus | null;

  /** True only when this event actually moved Payment#status. */
  @Column({ type: 'boolean' })
  applied: boolean;

  /**
   * e.g. 'payment_not_found', 'invalid_signature', 'conflicting_event'.
   * Null for a clean, expected no-op (plain duplicate delivery) or a
   * successfully applied transition.
   */
  @Column({ type: 'varchar', nullable: true })
  anomaly: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
