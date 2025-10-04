import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Supplier } from '../suppliers/suppliers.entity';
import { AssetDisposal } from 'src/asset-disposals/entities/asset-disposal.entity';
import { AssetAudit } from '../asset-audits/entities/asset-audit.entity';

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

  @OneToMany(() => AssetDisposal, (disposal) => disposal.asset)
  disposals: AssetDisposal[];

  @OneToMany(() => AssetAudit, (assetAudit) => assetAudit.asset)
  audits: AssetAudit[];

  @Column({ default: 'active' })
  status: 'active' | 'disposed';
}
