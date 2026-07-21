import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VisitorStatus } from '../enums/visitor-status.enum';

@Entity('visitors')
@Index(['hostUserId'])
@Index(['status'])
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  hostUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostUserId' })
  host: User;

  @Column({ type: 'varchar', length: 255 })
  visitorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  visitorEmail?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  visitorPhone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company?: string;

  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @Column({ type: 'timestamptz', nullable: true })
  expectedArrival?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualArrival?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualDeparture?: Date;

  @Column({
    type: 'enum',
    enum: VisitorStatus,
    default: VisitorStatus.EXPECTED,
  })
  status: VisitorStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}