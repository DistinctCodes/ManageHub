import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * HubSettings — singleton entity (always exactly one row).
 * Seeded on app startup if the table is empty.
 */
@Entity('hub_settings')
export class HubSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, default: 'ManageHub' })
  hubName: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  /** IANA timezone string e.g. "Africa/Lagos" */
  @Column({ type: 'varchar', length: 100, default: 'Africa/Lagos' })
  timezone: string;

  /** ISO 4217 currency code */
  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  /** VAT rate as a percentage e.g. 7.5 */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7.5 })
  vatRatePercent: number;

  /**
   * Business hours JSONB.
   * Shape: { mon: { open: '09:00', close: '18:00', closed: false }, ..., sun: { closed: true } }
   */
  @Column({ type: 'jsonb', nullable: true })
  businessHours?: Record<
    string,
    { open?: string; close?: string; closed: boolean }
  >;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  /** Hex colour string e.g. "#1a56db" */
  @Column({ type: 'varchar', length: 7, nullable: true })
  primaryColor?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  faviconUrl?: string;

  /** Minimum hours before a booking can be made */
  @Column({ type: 'int', default: 1 })
  bookingLeadTimeHours: number;

  /** Maximum days in advance a booking can be made */
  @Column({ type: 'int', default: 90 })
  maxBookingDaysAhead: number;

  /** Hours before booking start within which cancellation is penalised */
  @Column({ type: 'int', default: 24 })
  cancellationPolicyHours: number;

  @UpdateDateColumn()
  updatedAt: Date;
}