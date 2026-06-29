import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Booking } from '../../../bookings/entities/booking.entity';
import { AccessProvider } from '../enums/access-provider.enum';

@Entity('access_credentials')
@Index(['userId'])
@Index(['bookingId'])
export class AccessCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'varchar' })
  externalCredentialId: string;

  @Column({ type: 'enum', enum: AccessProvider })
  provider: AccessProvider;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz' })
  grantedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
