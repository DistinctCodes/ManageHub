import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable name, e.g. "Projector", "Whiteboard" */
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Price per session in kobo (0 = free add-on) */
  @Column({ type: 'int', default: 0 })
  priceKoboPerSession: number;

  /** Number of units available */
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  /**
   * Workspace types this resource applies to, e.g. ["MEETING_ROOM"].
   * Null means it applies to all workspace types.
   */
  @Column({ type: 'jsonb', nullable: true })
  applicableWorkspaceTypes: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}