import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EventType } from './event.entity';

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum TemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('event_templates')
@Index(['createdBy'])
@Index(['category'])
@Index(['status'])
export class EventTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

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

  @Column({ length: 500 })
  location: string;

  @Column({ type: 'int', default: 50 })
  defaultCapacity: number;

  @Column({ type: 'int', default: 120 }) // minutes
  defaultDuration: number;

  @Column({ length: 255, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  agenda: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultPrice: number;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: true })
  allowWaitlist: boolean;

  @Column({ type: 'int', default: 24 }) // hours before event
  registrationDeadlineHours: number;

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

  // Organizer defaults
  @Column({ length: 255, nullable: true })
  defaultOrganizerId: string;

  @Column({ length: 255, nullable: true })
  defaultOrganizerName: string;

  @Column({ length: 255, nullable: true })
  defaultOrganizerEmail: string;

  // Recurrence settings
  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  recurrenceType: RecurrenceType;

  @Column({ type: 'int', nullable: true })
  recurrenceInterval: number; // e.g., every 2 weeks

  @Column({ type: 'json', nullable: true })
  recurrenceConfig: Record<string, any>; // Custom recurrence rules

  @Column({ type: 'date', nullable: true })
  recurrenceEndDate: Date;

  @Column({ type: 'int', nullable: true })
  maxOccurrences: number;

  // Template metadata
  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.ACTIVE,
  })
  status: TemplateStatus;

  @Column({ length: 255 })
  createdBy: string;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isRecurring(): boolean {
    return this.recurrenceType !== RecurrenceType.NONE;
  }

  get hasRecurrenceLimit(): boolean {
    return this.recurrenceEndDate !== null || this.maxOccurrences !== null;
  }
}
