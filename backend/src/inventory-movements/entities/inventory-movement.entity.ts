import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InventoryItem, item => item.movements, { eager: true })
  item: InventoryItem;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column('int')
  quantity: number;

  @CreateDateColumn()
  date: Date;

  @Column()
  initiatedBy: string;
}
