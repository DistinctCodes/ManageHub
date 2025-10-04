import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProcurementStatus } from '../enums/procurement-status.enum';

@Entity('procurement_requests')
export class ProcurementRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column({ type: 'enum', enum: ProcurementStatus, default: ProcurementStatus.PENDING })
  status: ProcurementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}