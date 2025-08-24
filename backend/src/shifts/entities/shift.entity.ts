import { Location } from 'src/location/entities/location.entity';
import { Staff } from 'src/staff/entities/staff.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Staff, (staff) => staff.shifts, { eager: true })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ManyToOne(() => Location, (location) => location.shifts, { eager: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    name: 'break_duration',
    default: 0,
    comment: 'Break duration in minutes',
  })
  breakDuration: number;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.SCHEDULED,
  })
  status: ShiftStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({
    name: 'hours_worked',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  hoursWorked: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
