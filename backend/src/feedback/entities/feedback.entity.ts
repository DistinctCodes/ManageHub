import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FeedbackType } from '../enums/feedback-type.enum';
import { FeedbackStatus } from '../enums/feedback-status.enum';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.GENERAL,
  })
  type: FeedbackType;

  @Column('varchar', { length: 200 })
  subject: string;

  @Column('text')
  body: string;

  @Column('int', { nullable: true })
  rating: number | null;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.OPEN,
  })
  status: FeedbackStatus;

  @Column('text', { nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
