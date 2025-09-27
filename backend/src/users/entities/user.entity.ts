import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  fullName: string;

  @Column({ unique: true })
  @Index({ unique: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber?: string | null;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}