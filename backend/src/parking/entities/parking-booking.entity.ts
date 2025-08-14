import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ParkingSlot } from './parking-slot.entity';

@Entity('parking_bookings')
export class ParkingBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ParkingSlot, (s) => s.bookings, { eager: true })
  @JoinColumn({ name: 'slotId' })
  slot: ParkingSlot;

  @Column()
  slotId: string;

  @Column()
  staffId: string; // simple identifier for staff

  @CreateDateColumn()
  reservedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  releasedAt: Date | null;
}
