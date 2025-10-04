import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export type AlertType = 'low_stock';

@Entity({ name: 'alerts' })
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InventoryItem, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column()
  sku: string;

  @Column()
  itemName: string;

  @Column({ type: 'integer' })
  currentQuantity: number;

  @Column({ type: 'integer' })
  threshold: number;

  @Column({ type: 'varchar', default: 'low_stock' })
  type: AlertType;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({ type: 'varchar', default: 'system' })
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
