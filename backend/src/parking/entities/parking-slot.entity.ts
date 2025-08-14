import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ParkingBooking } from './parking-booking.entity';

@Entity('parking_slots')
export class ParkingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., A1, B2

  @Column({ nullable: true })
  location?: string; // optional description

  @Column({ default: false })
  isReserved: boolean;

  @OneToMany(() => ParkingBooking, (b) => b.slot)
  bookings: ParkingBooking[];

  @CreateDateColumn()
  createdAt: Date;
}
