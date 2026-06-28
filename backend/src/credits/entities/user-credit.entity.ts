import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_credits')
export class UserCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remainingHours: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
