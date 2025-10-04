/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // e.g. LOGIN, CREATE_USER, UPDATE_ASSET

  @Column({ nullable: true })
  entity: string; // e.g. User, Asset

  @Column({ nullable: true })
  entityId: string; // e.g. the affected entity's ID

  @Column()
  userId: string; // who performed the action

  @Column({ type: 'json', nullable: true })
  details: any; // extra payload

  @CreateDateColumn()
  timestamp: Date;
}
