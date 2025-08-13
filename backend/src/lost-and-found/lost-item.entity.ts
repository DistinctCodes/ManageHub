// src/lost-and-found/entities/lost-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('lost_items')
export class LostItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  photoUrl?: string;

  @Column()
  description: string;

  @Column({ type: 'date' })
  dateFound: Date;

  @Column({ default: false })
  claimed: boolean;

  @Column({ nullable: true })
  claimedBy?: string; // Name or userId of claimant

  @CreateDateColumn()
  createdAt: Date;
}
