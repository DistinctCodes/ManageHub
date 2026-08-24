import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentCreditApplicationKind } from '../enums/payment-credit-application-kind.enum';

/**
 * Links a #1570/#1574 Payment to what the credit ledger does with it once
 * it CONFIRMS (issue #1575) — either funding the payer's credit balance
 * or distributing the amount across a RevenueSplitConfig.
 *
 * This table lives on the credits side on purpose: it lets a split config
 * be attached to a Payment, and the application be marked done, without
 * the payments module having to know the credits module exists. The
 * dependency stays one-directional — credits reads payments, never the
 * reverse.
 *
 * `appliedAt` only makes finding candidates cheap; the real idempotency
 * guard is the UNIQUE ledger transaction reference, so a crash between
 * posting and marking cannot double-apply.
 */
@Entity('payment_credit_applications')
@Index('uq_payment_credit_applications_payment_id', ['paymentId'], {
  unique: true,
})
export class PaymentCreditApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  @Column({ type: 'enum', enum: PaymentCreditApplicationKind })
  kind: PaymentCreditApplicationKind;

  @Column({ type: 'uuid', name: 'split_config_id', nullable: true })
  splitConfigId: string | null;

  @Column({ type: 'uuid', name: 'ledger_transaction_id', nullable: true })
  ledgerTransactionId: string | null;

  @Column({ type: 'timestamptz', name: 'applied_at', nullable: true })
  appliedAt: Date | null;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
