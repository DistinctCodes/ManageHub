import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from './partner.entity';

export enum ContactType {
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  OTHER = 'other',
}

@Entity()
export class PartnerContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    enum: ContactType,
    default: ContactType.EMAIL,
  })
  type: ContactType;

  @Column()
  value: string;

  @Column({ nullable: true })
  label: string;

  @Column({ default: true })
  isPrimary: boolean;

  @ManyToOne(() => Partner, (partner) => partner.contacts, { onDelete: 'CASCADE' })
  @JoinColumn()
  partner: Partner;

  @Column()
  partnerId: string;
}
