import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PreferenceType {
  LIGHTING = 'lighting',
  DESK_HEIGHT = 'desk_height',
  TEMPERATURE = 'temperature',
  MONITOR_BRIGHTNESS = 'monitor_brightness',
  CHAIR_HEIGHT = 'chair_height',
  BACKGROUND_NOISE = 'background_noise',
}

@Entity('workspace_preferences')
@Index(['userId', 'preferenceType'], { unique: true })
export class WorkspacePreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: PreferenceType,
    name: 'preference_type',
  })
  preferenceType: PreferenceType;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
