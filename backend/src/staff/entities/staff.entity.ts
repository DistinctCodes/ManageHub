import { Attendance } from '../../attendance/entities/attendance.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StaffRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CLEANER = 'cleaner',
  SECURITY = 'security',
  RECEPTIONIST = 'receptionist',
}

@Entity()
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  employeeId: string;

  @Column({
    type: 'enum',
    enum: StaffRole,
    default: StaffRole.CLEANER,
  })
  role: StaffRole;

  @Column({ type: 'time', nullable: true, comment: 'e.g., 09:00' })
  shiftStartTime: string;

  @Column({ type: 'time', nullable: true, comment: 'e.g., 17:00' })
  shiftEndTime: string;

  @OneToMany(() => Attendance, (attendance) => attendance.staff)
  attendanceRecords: Attendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
