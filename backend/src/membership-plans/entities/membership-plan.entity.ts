import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingCycle } from '../enums/billing-cycle.enum';

@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Price in kobo (NGN smallest unit) */
  @Column({ type: 'int' })
  priceKobo: number;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  /** JSON array of feature strings e.g. ["Unlimited hot-desk", "5 meeting hours"] */
  @Column({ type: 'jsonb', default: [] })
  features: string[];

  /** 0 = unlimited */
  @Column({ type: 'int', default: 0 })
  bookingHoursIncluded: number;

  @Column({ type: 'int', default: 0 })
  guestPassesPerMonth: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}