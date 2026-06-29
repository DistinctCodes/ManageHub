import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('nps_survey_responses')
@Index(['userId'])
export class NpsSurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', unique: true })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
