import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CommunityPostLike } from './community-post-like.entity';

@Entity('community_posts')
@Index(['isDeleted', 'isPinned', 'createdAt'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  authorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorUserId' })
  author: User;

  @Column({ type: 'text', length: 1000 })
  body: string;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @OneToMany(() => CommunityPostLike, (like) => like.post)
  likes: CommunityPostLike[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
