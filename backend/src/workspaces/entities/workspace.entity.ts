import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkspaceType } from '../enums/workspace-type.enum';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: WorkspaceType })
  type: WorkspaceType;

  @Column({ type: 'int', default: 1 })
  totalSeats: number;

  // BE-01: this is a rough, non-date-scoped running counter kept in sync by
  // CreateBookingProvider/CancelBookingProvider/CompleteBookingProvider — it
  // does NOT account for booking date ranges (a booking for next month still
  // decrements it today), so it should be treated as an approximate capacity
  // gauge only (e.g. for admin listings). The authoritative, date-scoped
  // availability check is GET /workspaces/:id/availability, which computes
  // live from overlapping bookings via CheckWorkspaceAvailabilityProvider.
  @Column({ type: 'int', default: 1 })
  availableSeats: number;

  // Stored in kobo (smallest currency unit). e.g. ₦5000/hr = 500000 kobo
  @Column({ type: 'bigint' })
  hourlyRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  amenities: string[];

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
