import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['email'])
@Index(['email'])
@Index(['isActive'])
@Index(['isVerified'])
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 254 })
  email: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column('varchar', { length: 128, nullable: true })
  verificationToken?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationTokenExpiresAt?: Date | null;

  @Column({ type: 'timestamptz' })
  subscribedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unsubscribedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column('varchar', { length: 128 })
  unsubscribeToken: string;

  @Column('timestamptz', { nullable: true })
  consentedAt?: Date;

  @Column('varchar', { length: 64, nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
