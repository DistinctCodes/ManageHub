import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkspaceType } from '../enums/workspace-type.enum';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: WorkspaceType })
  type: WorkspaceType;

  @Column({ type: 'int', default: 1 })
  totalSeats: number;

  @Column({ type: 'int', default: 1 })
  availableSeats: number;

  // Stored in kobo (smallest currency unit). e.g. ₦5000/hr = 500000 kobo
  @Column({ type: 'bigint' })
  hourlyRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  amenities: string[];

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
