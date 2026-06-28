import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FloorPlan } from './floor-plan.entity';

@Entity('floor_plan_zones')
export class FloorPlanZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  floorPlanId: string;

  @ManyToOne(() => FloorPlan, (fp) => fp.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floorPlanId' })
  floorPlan: FloorPlan;

  @Column('uuid', { nullable: true })
  workspaceId: string | null;

  @Column({ type: 'float' })
  x: number;

  @Column({ type: 'float' })
  y: number;

  @Column({ type: 'float' })
  width: number;

  @Column({ type: 'float' })
  height: number;

  @Column({ nullable: true })
  label: string | null;

  @Column({ nullable: true, default: '#6366f1' })
  color: string | null;
}
