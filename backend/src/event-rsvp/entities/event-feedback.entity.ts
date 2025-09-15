import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';
import { EventRsvp } from './event-rsvp.entity';

export enum FeedbackStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
}

@Entity('event_feedback')
@Index(['eventId'])
@Index(['rsvpId'])
@Index(['attendeeEmail'])
@Index(['status'])
export class EventFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  rsvpId: string;

  @Column({ length: 255 })
  attendeeName: string;

  @Column({ length: 255 })
  attendeeEmail: string;

  @Column({ type: 'int', nullable: true })
  overallRating: number; // 1-5 stars

  @Column({ type: 'int', nullable: true })
  contentRating: number; // 1-5 stars

  @Column({ type: 'int', nullable: true })
  organizationRating: number; // 1-5 stars

  @Column({ type: 'int', nullable: true })
  venueRating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'text', nullable: true })
  suggestions: string;

  @Column({ type: 'text', nullable: true })
  whatWorkedWell: string;

  @Column({ type: 'text', nullable: true })
  whatCouldImprove: string;

  @Column({ default: false })
  wouldRecommend: boolean;

  @Column({ default: false })
  wouldAttendAgain: boolean;

  @Column({ type: 'json', nullable: true })
  customResponses: Record<string, any>;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ length: 255, nullable: true })
  reviewedBy: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => EventRsvp, { nullable: true })
  @JoinColumn({ name: 'rsvpId' })
  rsvp: EventRsvp;

  // Computed properties
  get averageRating(): number {
    const ratings = [
      this.overallRating,
      this.contentRating,
      this.organizationRating,
      this.venueRating,
    ].filter(rating => rating !== null && rating !== undefined);

    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  get isSubmitted(): boolean {
    return this.status === FeedbackStatus.SUBMITTED || this.status === FeedbackStatus.REVIEWED;
  }

  get isReviewed(): boolean {
    return this.status === FeedbackStatus.REVIEWED;
  }
}