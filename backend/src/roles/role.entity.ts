import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { PermissionEntity } from './permission.entity'; // <-- FIXED IMPORT

@Entity()
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => PermissionEntity, { eager: true })
  @JoinTable()
  permissions: PermissionEntity[];
}
