import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VisitorStatus } from '../enums/visitor-status.enum';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'uuid' })
  hostMemberId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hostMemberId' })
  hostMember: User;

  @Column()
  purpose: string;

  @Column({ type: 'date' })
  expectedDate: string;

  @Column({
    type: 'enum',
    enum: VisitorStatus,
    default: VisitorStatus.EXPECTED,
  })
  status: VisitorStatus;

  @Column({ nullable: true })
  qrCode?: string;

  @Column({ type: 'timestamptz', nullable: true })
  checkInTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  checkOutTime?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
