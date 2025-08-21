import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './partner.entity';

@Entity()
export class PartnerService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Partner, (partner) => partner.services, { onDelete: 'CASCADE' })
  @JoinColumn()
  partner: Partner;

  @Column()
  partnerId: string;
}
