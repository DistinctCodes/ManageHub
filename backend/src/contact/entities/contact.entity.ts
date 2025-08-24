import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContactType {
  INTERNAL = 'Internal',
  VENDOR = 'Vendor',
  REGULATOR = 'Regulator',
  OTHER = 'Other',
}

@Entity('contacts')
@Index(['name'])
@Index(['organization'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255 })
  organization: string;

  @Column({ type: 'varchar', length: 255 })
  designation: string;

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.OTHER,
  })
  type: ContactType;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
