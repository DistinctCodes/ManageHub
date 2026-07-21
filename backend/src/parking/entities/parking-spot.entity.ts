import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ParkingSpotType {
  STANDARD    = 'STANDARD',
  ACCESSIBLE  = 'ACCESSIBLE',
  MOTORCYCLE  = 'MOTORCYCLE',
  EV_CHARGING = 'EV_CHARGING',
}

@Entity('parking_spots')
@Index(['spotNumber'], { unique: true })
@Index(['assignedToUserId'])
export class ParkingSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique identifier, e.g. "A-12" */
  @Column({ type: 'varchar', length: 20, unique: true })
  spotNumber: string;

  /** Physical level/floor, e.g. "Ground Floor", "Level 2" */
  @Column({ type: 'varchar', length: 80, nullable: true })
  level: string | null;

  @Column({ type: 'enum', enum: ParkingSpotType, default: ParkingSpotType.STANDARD })
  type: ParkingSpotType;

  @Column({ type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedTo: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}