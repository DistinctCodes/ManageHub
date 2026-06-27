import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscountType } from '../enums/discount-type.enum';
import { WorkspaceType } from '../../workspaces/enums/workspace-type.enum';
import { PromoCodeUsage } from './promo-code-usage.entity';

@Entity('promo_codes')
@Index(['code'], { unique: true })
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: DiscountType })
  discountType: DiscountType;

  @Column({ type: 'int' })
  discountValue: number;

  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'int', default: 0 })
  minBookingAmount: number;

  @Column({ type: 'simple-array', nullable: true })
  applicableWorkspaceTypes: WorkspaceType[] | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => PromoCodeUsage, (usage) => usage.promoCode)
  usages: PromoCodeUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
