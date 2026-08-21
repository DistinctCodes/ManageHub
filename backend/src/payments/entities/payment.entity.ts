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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
