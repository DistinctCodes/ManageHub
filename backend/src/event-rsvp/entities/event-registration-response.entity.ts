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
import { EventRegistrationForm } from './event-registration-form.entity';

export enum ResponseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('event_registration_responses')
@Index(['eventId'])
@Index(['formId'])
@Index(['rsvpId'])
@Index(['respondentEmail'])
@Index(['status'])
@Index(['submittedAt'])
export class EventRegistrationResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  formId: string;

  @Column({ type: 'uuid', nullable: true })
  rsvpId: string;

  @Column({ length: 255 })
  respondentName: string;

  @Column({ length: 255 })
  respondentEmail: string;

  @Column({ length: 255, nullable: true })
  respondentPhone: string;

  @Column({ type: 'json' })
  responses: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  attachments: RegistrationAttachment[];

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.DRAFT,
  })
  status: ResponseStatus;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ length: 255, nullable: true })
  reviewedBy: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'json', nullable: true })
  validationErrors: ValidationError[];

  @Column({ default: false })
  isValid: boolean;

  @Column({ type: 'float', nullable: true })
  score: number; // For scoring responses if needed

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => EventRegistrationForm)
  @JoinColumn({ name: 'formId' })
  form: EventRegistrationForm;

  @ManyToOne(() => EventRsvp, { nullable: true })
  @JoinColumn({ name: 'rsvpId' })
  rsvp: EventRsvp;

  // Computed properties
  get isSubmitted(): boolean {
    return this.status !== ResponseStatus.DRAFT;
  }

  get isApproved(): boolean {
    return this.status === ResponseStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this.status === ResponseStatus.REJECTED;
  }

  get isDraft(): boolean {
    return this.status === ResponseStatus.DRAFT;
  }

  get hasValidationErrors(): boolean {
    return this.validationErrors && this.validationErrors.length > 0;
  }
}

export interface RegistrationAttachment {
  fieldId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface ValidationError {
  fieldId: string;
  fieldName: string;
  rule: string;
  message: string;
  value?: any;
}
