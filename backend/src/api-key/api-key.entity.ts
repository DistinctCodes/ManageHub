import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('api_keys')
@Index(['keyHash'])
@Index(['appName'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  appName: string;

  @Column()
  keyHash: string;

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'simple-array', nullable: true })
  allowedEndpoints: string[];

  @Column({ type: 'int', default: 1000 })
  dailyLimit: number;

  @Column({ type: 'int', default: 0 })
  currentDayUsage: number;

  @Column({ type: 'date', nullable: true })
  lastUsageDate: Date;

  @Column({ type: 'int', default: 0 })
  totalUsage: number;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
