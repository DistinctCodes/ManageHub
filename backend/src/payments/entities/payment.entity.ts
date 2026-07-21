import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 64, unique: true })
  reference: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column('varchar', { length: 254, nullable: true })
  email?: string;

  @Column('uuid', { nullable: true })
  userId?: string;

  @Column('varchar', { length: 100, nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column('varchar', { length: 100, nullable: true })
  paystackReference?: string;

  @Column('varchar', { length: 50, nullable: true })
  gatewayResponse?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
