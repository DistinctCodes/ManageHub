import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AccessDevice } from './access-device.entity';
import { AccessAction } from '../enums/access-action.enum';
import { AccessMethod } from '../enums/access-method.enum';

@Entity('access_logs')
@Index(['deviceId'])
@Index(['userId'])
@Index(['timestamp'])
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => AccessDevice, (device) => device.logs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'deviceId' })
  device: AccessDevice;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'enum', enum: AccessAction })
  action: AccessAction;

  @Column({ type: 'text', nullable: true })
  denyReason: string | null;

  @Column({ type: 'enum', enum: AccessMethod })
  method: AccessMethod;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
