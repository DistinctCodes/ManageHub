import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';


@Entity('assets')
export class Asset {
@PrimaryGeneratedColumn('uuid')
id: string;


@Column({ length: 50, default: 'active' })
status: string; // e.g. 'active' | 'disposed' | 'maintenance'


@Column({ type: 'int', nullable: true })
quantity: number | null;


@Column({ type: 'timestamptz', nullable: true })
disposedAt: Date | null;


@Column({ length: 100, nullable: true })
location: string | null;


@CreateDateColumn()
createdAt: Date;


@UpdateDateColumn()
updatedAt: Date;
}