import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { WorkspaceType } from '../../workspaces/enums/workspace-type.enum';

@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'bigint' })
  price: number;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({ type: 'int', nullable: true })
  maxBookingsPerMonth?: number;

  @Column({ type: 'int', nullable: true })
  meetingRoomHoursPerMonth?: number;

  @Column({ type: 'jsonb', default: [] })
  allowedWorkspaceTypes: WorkspaceType[];

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, unknown>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}