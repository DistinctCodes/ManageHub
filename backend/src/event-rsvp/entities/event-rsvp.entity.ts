import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Event } from './event.entity';

export enum RsvpStatus {
  CONFIRMED = 'confirmed',
  WAITLISTED = 'waitlisted',
  CANCELLED = 'cancelled',
  ATTENDED = 'attended',
  NO_SHOW = 'no_show',
}

export enum RsvpSource {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  ADMIN = 'admin',
  IMPORT = 'import',
}

@Entity('event_rsvps')
@Unique(['eventId', 'attendeeEmail'])
@Index(['eventId', 'status'])
@Index(['attendeeEmail'])
@Index(['userId'])
@Index(['createdAt'])
export class EventRsvp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ length: 255, nullable: true })
  userId: string;

  @Column({ length: 255 })
  attendeeName: string;

  @Column({ length: 255 })
  attendeeEmail: string;

  @Column({ length: 20, nullable: true })
  attendeePhone: string;

  @Column({ length: 255, nullable: true })
  attendeeOrganization: string;

  @Column({
    type: 'enum',
    enum: RsvpStatus,
    default: RsvpStatus.CONFIRMED,
  })
  status: RsvpStatus;

  @Column({
    type: 'enum',
    enum: RsvpSource,
    default: RsvpSource.WEB,
  })
  source: RsvpSource;

  @Column({ type: 'int', nullable: true })
  waitlistPosition: number;

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @Column({ type: 'text', nullable: true })
  dietaryRestrictions: string;

  @Column({ type: 'json', nullable: true })
  customResponses: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'datetime', nullable: true })
  checkedInAt: Date;

  @Column({ length: 500, nullable: true })
  cancellationReason: string;

  @Column({ default: false })
  isVip: boolean;

  @Column({ default: false })
  emailConfirmationSent: boolean;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event, (event) => event.rsvps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // Computed properties
  get isConfirmed(): boolean {
    return this.status === RsvpStatus.CONFIRMED;
  }

  get isWaitlisted(): boolean {
    return this.status === RsvpStatus.WAITLISTED;
  }

  get isCancelled(): boolean {
    return this.status === RsvpStatus.CANCELLED;
  }

  get hasAttended(): boolean {
    return this.status === RsvpStatus.ATTENDED;
  }

  get canCheckIn(): boolean {
    return this.status === RsvpStatus.CONFIRMED && !this.checkedInAt;
  }

  get canCancel(): boolean {
    return [RsvpStatus.CONFIRMED, RsvpStatus.WAITLISTED].includes(this.status);
  }
}
