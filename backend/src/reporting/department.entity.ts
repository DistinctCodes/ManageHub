import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Asset } from './asset.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity()
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Asset, (asset) => asset.department)
  assets: Asset[];

  @OneToMany(() => InventoryItem, (it) => it.department)
  inventoryItems: InventoryItem[];
}
