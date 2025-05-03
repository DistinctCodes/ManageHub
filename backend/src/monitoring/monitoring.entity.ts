import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class MonitoringLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  type: 'staff' | 'user';

  @Column()
  action: 'check-in' | 'check-out';

  @CreateDateColumn()
  timestamp: Date;

  @Column()
  deviceUsed: string;

  @Column()
  workspaceId: number;
}
