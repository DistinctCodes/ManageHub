import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'USD' })
  defaultCurrency: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'straight_line' })
  depreciationMethod: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
