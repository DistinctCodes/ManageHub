import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  actorUserId: string;

  @Column()
  @Index()
  action: string;

  @Column()
  resourceType: string;

  @Column({ nullable: true })
  @Index()
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
