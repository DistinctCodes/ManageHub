import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BillingCycleStatus {
  PENDING = 'pending',
  INVOICED = 'invoiced',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('billing_cycles')
export class BillingCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  bookingId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'bigint' })
  amountKobo: number;

  @Column({ type: 'enum', enum: BillingCycleStatus, default: BillingCycleStatus.PENDING })
  status: BillingCycleStatus;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
