import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum EventType {
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  NETWORKING = 'networking',
  TRAINING = 'training',
  CONFERENCE = 'conference',
  MEETING = 'meeting',
  SOCIAL = 'social',
  OTHER = 'other',
}

@Entity('events')
@Index(['startDate', 'status'])
@Index(['eventType', 'status'])
@Index(['organizerId'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.OTHER,
  })
  eventType: EventType;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ length: 500 })
  location: string;

  @Column({ type: 'int', default: 50 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  confirmedRsvps: number;

  @Column({ type: 'int', default: 0 })
  waitlistCount: number;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ length: 255, nullable: true })
  organizerId: string;

  @Column({ length: 255, nullable: true })
  organizerName: string;

  @Column({ length: 255, nullable: true })
  organizerEmail: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  agenda: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: true })
  allowWaitlist: boolean;

  @Column({ type: 'datetime', nullable: true })
  registrationDeadline: Date;

  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string;

  @Column({ type: 'text', nullable: true })
  additionalInfo: string;

  @Column({ length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('EventRsvp', 'event', {
    cascade: true,
    onDelete: 'CASCADE',
  })
  rsvps: any[];

  // Computed properties
  get availableSlots(): number {
    return Math.max(0, this.capacity - this.confirmedRsvps);
  }

  get isFullyBooked(): boolean {
    return this.confirmedRsvps >= this.capacity;
  }

  get registrationOpen(): boolean {
    if (this.status !== EventStatus.PUBLISHED) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    return true;
  }

  get canAcceptRsvp(): boolean {
    return this.registrationOpen && (this.availableSlots > 0 || this.allowWaitlist);
  }
}