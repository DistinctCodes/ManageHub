import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../suppliers/suppliers.entity';
import { AssetMaintenance } from '../asset-maintenance/asset-maintenence.entity';
import { Branch } from 'src/branches/entities/branch.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.assets)
  supplier: Supplier;

  @ManyToOne(() => Branch, (branch) => branch.assets, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @OneToMany(() => AssetMaintenance, (maintenance) => maintenance.asset)
  maintenances: AssetMaintenance[];
}
