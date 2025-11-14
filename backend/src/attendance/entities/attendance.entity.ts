import { Staff } from 'src/staff/entities/staff.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Staff, (staff) => staff.attendanceRecords)
  staff: Staff;

  @Column({ type: 'timestamptz' }) // Use 'timestamptz' for time zone support
  clockIn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clockOut: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalHours: number | null;

  // Automatically sets the clock-in time on creation if not provided
  @CreateDateColumn()
  createdAt: Date;
}
