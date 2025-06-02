import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g., 'CREATE_WORKSPACE', 'DELETE_WORKSPACE'
}
