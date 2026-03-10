import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { InvoiceStatus } from '../enums/invoice-status.enum';

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column()
  userId: string;

  @Column()
  orderId: string;

  @Column()
  paymentId: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueAt: Date;

  @Column({ type: 'jsonb' })
  items: Record<string, any>[];

  @Column('decimal')
  subtotal: number;

  @Column('decimal')
  tax: number;

  @Column('decimal')
  total: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}