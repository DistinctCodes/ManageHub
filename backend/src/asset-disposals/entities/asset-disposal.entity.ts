import { Asset } from 'src/assets/assets.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('asset_disposals')
export class AssetDisposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, (asset) => asset.disposals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  assetId: string;

  @Column({ type: 'date' })
  disposalDate: Date;

  @Column({ type: 'varchar', length: 50 })
  method: string; // e.g., sale, donation, scrap

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 100 })
  approvedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
