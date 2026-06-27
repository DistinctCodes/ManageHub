import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PromoCode } from './promo-code.entity';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('promo_code_usages')
@Unique(['promoCodeId', 'userId'])
export class PromoCodeUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  promoCodeId: string;

  @ManyToOne(() => PromoCode, (promoCode) => promoCode.usages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'int' })
  discountApplied: number;

  @CreateDateColumn()
  usedAt: Date;
}
