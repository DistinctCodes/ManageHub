import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Resource } from './resource.entity';
import { User } from '../../../users/entities/user.entity';

export enum ResourceBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('resource_bookings')
export class ResourceBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  resourceId: string;

  @ManyToOne(() => Resource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'int', default: 1 })
  quantityRequested: number;

  @Column({ type: 'enum', enum: ResourceBookingStatus, default: ResourceBookingStatus.PENDING })
  status: ResourceBookingStatus;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column({ type: 'int', default: 0 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
