import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { InventoryMovement } from './inventory-movement.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  stock: number;

  @OneToMany(() => InventoryMovement, movement => movement.item)
  movements: InventoryMovement[];
}
