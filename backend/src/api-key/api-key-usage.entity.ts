import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('api_key_usage')
@Index(['apiKeyId', 'createdAt'])
export class ApiKeyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  apiKeyId: string;

  @ManyToOne(() => ApiKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'int', nullable: true })
  responseTime: number;

  @CreateDateColumn()
  createdAt: Date;
}
