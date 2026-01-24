// backend/src/auth/entities/backup-code.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('backup_codes')
export class BackupCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  codeHash: string;

  @Column({ default: false })
  used: boolean;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
