import { Attendance } from 'src/attendance/entities/attendance.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

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

  @OneToMany(() => Attendance, (attendance) => attendance.staff)
  attendanceRecords: Attendance[];
}
