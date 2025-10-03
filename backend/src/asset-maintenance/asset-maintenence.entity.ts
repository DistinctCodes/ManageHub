import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Asset } from 'src/assets/assets.entity';

@Entity('asset_maintenance')
export class AssetMaintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Asset, (asset) => asset.maintenances, { onDelete: 'CASCADE' })
  asset: Asset;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  @Column({ type: 'varchar' })
  maintenanceType: string; // e.g. "servicing", "replacement"

  @Column({ type: 'text', nullable: true })
  notes: string;
}
