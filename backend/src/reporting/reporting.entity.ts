import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Asset } from './asset.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Asset, (asset) => asset.category)
  assets: Asset[];

  @OneToMany(() => InventoryItem, (it) => it.category)
  inventoryItems: InventoryItem[];
}
