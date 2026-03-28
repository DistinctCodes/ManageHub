import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  bookingId: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'int' })
  amountKobo: number;

  @Column({ type: 'timestamp' })
  paymentDate: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => User, (user) => user.invoices, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Booking, (booking) => booking.invoices, { onDelete: 'CASCADE' })
  booking: Booking;

  @ManyToOne(() => Payment, (payment) => payment.invoices, { onDelete: 'CASCADE' })
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
