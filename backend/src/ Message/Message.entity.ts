import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MessageThread } from './message-thread.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('messages')
@Index(['threadId'])
@Index(['senderUserId'])
@Index(['isRead'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  threadId: string;

  @ManyToOne(() => MessageThread, (thread) => thread.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: MessageThread;

  @Column({ type: 'uuid' })
  senderUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'senderUserId' })
  sender: User;

  @Column({ type: 'text' })
  body: string;

  /**
   * Tracks whether the message has been read.
   * Note: in a multi-participant thread, this is a per-message global flag.
   * For per-user read receipts, extend to a separate read_receipts table.
   */
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  sentAt: Date;
}