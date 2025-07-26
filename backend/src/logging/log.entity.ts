import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('sync_logs')
export class SyncLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  deviceId: string;
  @Column()
  timestamp: Date;
  @Column()
  status: 'success' | 'failure';
  @Column({ nullable: true })
  errorType?: string;
  @Column('int')
  attempts: number;
} 