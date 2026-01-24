// backend/src/auth/entities/two-factor-secret.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('two_factor_secrets')
export class TwoFactorSecret {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  encryptedSecret: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ default: 0 })
  failedAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
