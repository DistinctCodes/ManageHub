import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resource.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @Column({ length: 100 })
  bookedBy: string;

  @Column('timestamp')
  startTime: Date;

  @Column('timestamp')
  endTime: Date;
}
