import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PackageStatus } from '../enums/package-status.enum';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  recipientUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientUserId' })
  recipient: User;

  @Column('uuid')
  loggedByStaffId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loggedByStaffId' })
  loggedByStaff: User;

  @Column()
  courierName: string;

  @Column({ nullable: true })
  trackingNumber: string | null;

  @Column()
  description: string;

  @Column({ type: 'timestamptz' })
  arrivedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  collectedAt: Date | null;

  @Column({ type: 'enum', enum: PackageStatus, default: PackageStatus.ARRIVED })
  status: PackageStatus;

  @CreateDateColumn()
  createdAt: Date;
}
