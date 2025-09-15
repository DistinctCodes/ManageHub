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
import { EventTemplate } from './event-template.entity';
import { Event } from './event.entity';

export enum SeriesStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('event_series')
@Index(['templateId'])
@Index(['status'])
@Index(['nextEventDate'])
export class EventSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SeriesStatus,
    default: SeriesStatus.ACTIVE,
  })
  status: SeriesStatus;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ type: 'datetime', nullable: true })
  nextEventDate: Date;

  @Column({ type: 'int', default: 0 })
  eventsCreated: number;

  @Column({ type: 'int', nullable: true })
  maxEvents: number;

  @Column({ type: 'datetime', nullable: true })
  lastEventCreated: Date;

  @Column({ type: 'json', nullable: true })
  overrides: Record<string, any>; // Overrides for template settings

  @Column({ length: 255 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => EventTemplate)
  @JoinColumn({ name: 'templateId' })
  template: EventTemplate;

  // Computed properties
  get isActive(): boolean {
    return this.status === SeriesStatus.ACTIVE;
  }

  get hasReachedLimit(): boolean {
    if (this.maxEvents) {
      return this.eventsCreated >= this.maxEvents;
    }
    if (this.endDate) {
      return new Date() >= this.endDate;
    }
    return false;
  }

  get shouldCreateNextEvent(): boolean {
    return (
      this.isActive &&
      !this.hasReachedLimit &&
      this.nextEventDate &&
      this.nextEventDate <= new Date()
    );
  }
}
