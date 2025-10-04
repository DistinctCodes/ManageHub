import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Supplier } from '../suppliers/suppliers.entity';
import { AssetMaintenance } from '../asset-maintenance/asset-maintenence.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Supplier, supplier => supplier.assets)
  supplier: Supplier;

  @OneToMany(() => AssetMaintenance, (maintenance) => maintenance.asset)
  maintenances: AssetMaintenance[];
}
