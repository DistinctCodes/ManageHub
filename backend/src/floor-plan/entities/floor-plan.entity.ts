import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FloorPlanZone } from './floor-plan-zone.entity';

@Entity('floor_plans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1200 })
  canvasWidth: number;

  @Column({ type: 'int', default: 800 })
  canvasHeight: number;

  @Column({ type: 'text', nullable: true })
  backgroundImageUrl: string | null;

  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => FloorPlanZone, (zone) => zone.floorPlan, { cascade: true })
  zones: FloorPlanZone[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
