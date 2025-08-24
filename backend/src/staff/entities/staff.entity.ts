import { Shift } from 'src/shifts/entities/shift.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'staff_id', unique: true })
  staffId: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  position: string;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => Shift, (shift) => shift.staff)
  shifts: Shift[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
