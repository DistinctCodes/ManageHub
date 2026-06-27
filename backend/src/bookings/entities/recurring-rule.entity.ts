import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('recurring_rules')
export class RecurringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RecurringFrequency })
  frequency: RecurringFrequency;

  @Column({ type: 'int', default: 1 })
  interval: number;

  @Column({ type: 'simple-array', nullable: true })
  daysOfWeek: number[];

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'int', nullable: true })
  maxOccurrences: number;

  @Column('uuid')
  parentBookingId: string;

  @CreateDateColumn()
  createdAt: Date;
}
