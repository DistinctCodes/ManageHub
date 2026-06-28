import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LockerSize } from '../enums/locker-size.enum';

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  lockerNumber: string;

  @Column()
  floor: string;

  @Column({ type: 'enum', enum: LockerSize })
  size: LockerSize;

  @Column('uuid', { nullable: true })
  assignedToUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedTo: User;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
