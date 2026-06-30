import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_threads')
@Index(['lastMessageAt'])
export class MessageThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * JSON array of User UUIDs who are participants in this thread.
   * Stored as JSONB for flexible multi-participant support.
   */
  @Column({ type: 'jsonb' })
  participantIds: string[];

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Message, (msg) => msg.thread)
  messages: Message[];
}