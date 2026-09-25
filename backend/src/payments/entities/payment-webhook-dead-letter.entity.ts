import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Visible manual-review bucket for webhooks that failed processing (issue
 * #1811) — a delivery that could not be applied is persisted here (raw
 * payload retained) instead of being silently dropped, so an operator can
 * inspect, replay, or discard it. Distinct from `ConfirmationEvent`: the
 * event log is the append-only audit trail of every confirmation event;
 * this table only ever holds the ones that failed and still need a human.
 *
 * `invalid_signature`, `malformed_payload`, and `process_error` failures
 * all land here (see `payment-webhook.controller.ts`).
 */
@Entity('payment_webhook_dead_letters')
export class PaymentWebhookDeadLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** sha256 of the raw payload — the dedupe/lookup key. */
  @Index()
  @Column({ type: 'varchar', name: 'raw_payload_hash' })
  rawPayloadHash: string;

  /** Raw (unparsed) body, retained for manual inspection. */
  @Column({ type: 'text', name: 'raw_payload' })
  rawPayload: string;

  /** e.g. 'invalid_signature' | 'malformed_payload' | 'process_error'. */
  @Column({ type: 'varchar' })
  reason: string;

  /** The originating payment's provider reference, when mappable. */
  @Column({ type: 'varchar', name: 'provider_reference', nullable: true })
  providerReference: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  /** Set when an operator has triaged this entry. */
  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
