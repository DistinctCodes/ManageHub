import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hub_settings')
export class HubSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  hubName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  /**
   * Business hours stored as JSONB.
   * Shape: { monday: { open: "08:00", close: "20:00", isOpen: true }, ... }
   */
  @Column({ type: 'jsonb', nullable: true })
  businessHours: Record<
    string,
    { open: string; close: string; isOpen: boolean }
  >;

  @Column({ type: 'varchar', length: 100, default: 'Africa/Lagos' })
  timezone: string;

  /**
   * Tax rate as a percentage, e.g. 7.5 means 7.5%.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
