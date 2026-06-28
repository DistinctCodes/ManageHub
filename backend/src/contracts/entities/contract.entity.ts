import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  memberId: string;

  @Column('uuid')
  createdByAdminId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  bodyHtml: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  signatureData: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
