import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FAQCategory {
  GENERAL = 'general',
  WORKSPACE = 'workspace',
  POLICIES = 'policies',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  SECURITY = 'security',
  SUPPORT = 'support',
}

export enum FAQStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

@Entity('faqs')
@Index(['category', 'status'])
@Index(['isActive', 'priority'])
export class FAQ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  question: string;

  @Column('text')
  answer: string;

  @Column({
    type: 'enum',
    enum: FAQCategory,
    default: FAQCategory.GENERAL,
  })
  category: FAQCategory;

  @Column({
    type: 'enum',
    enum: FAQStatus,
    default: FAQStatus.ACTIVE,
  })
  status: FAQStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  priority: number; // Higher number = higher priority

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @Column({ length: 100, nullable: true })
  createdBy: string; // Admin ID or name

  @Column({ length: 100, nullable: true })
  updatedBy: string; // Admin ID or name

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
