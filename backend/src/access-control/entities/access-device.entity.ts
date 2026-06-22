import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DeviceType } from '../enums/device-type.enum';
import { DeviceStatus } from '../enums/device-status.enum';
import { AccessLog } from './access-log.entity';

@Entity('access_devices')
export class AccessDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DeviceType })
  type: DeviceType;

  @Column({ unique: true })
  deviceIdentifier: string;

  @Column({ type: 'uuid', nullable: true })
  locationId: string | null;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.OFFLINE })
  status: DeviceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @OneToMany(() => AccessLog, (log) => log.device)
  logs: AccessLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
