import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Asset } from '../../assets/assets.entity';

@Entity('asset_audits')
export class AssetAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, (asset) => asset.audits)
  asset: Asset;

  @Column({ type: 'uuid' })
  assetId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  auditDate: Date;

  @Column()
  auditedBy: string;

  @Column()
  status: string; // e.g., 'compliant', 'non-compliant', 'missing'

  @Column({ nullable: true })
  remarks: string;
}
