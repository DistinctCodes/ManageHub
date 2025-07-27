mport { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('energy_consumption')
@Index(['workspaceId', 'date'], { unique: true })
export class EnergyConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({ name: 'workspace_name' })
  workspaceName: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'power_consumption_kwh' })
  powerConsumptionKwh: number;

  @Column('date')
  @Index()
  date: Date;

  @Column({ name: 'device_count', default: 0 })
  deviceCount: number;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
