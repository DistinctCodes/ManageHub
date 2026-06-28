import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { MaintenanceCategory } from '../enums/maintenance-category.enum';
import { MaintenanceStatus } from '../enums/maintenance-status.enum';

@Entity('maintenance_requests')
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  reportedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedByUserId' })
  reportedBy: User;

  @Column('uuid', { nullable: true })
  workspaceId: string | null;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'enum', enum: MaintenanceCategory })
  category: MaintenanceCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  imageUrl: string | null;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.OPEN })
  status: MaintenanceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column('uuid', { nullable: true })
  resolvedByStaffId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolvedByStaffId' })
  resolvedByStaff: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
