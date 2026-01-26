import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enum/user-role-enum';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;
  @Column()
  fullName: string;
  @Column()
  @Exclude()
  password: string;
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SUBSCRIBER,
  })
  role: UserRole;

  @Column({ nullable: true })
  verificationCode?: string;

  @CreateDateColumn()
  verificationCodeExpiresAt?: Date;

  @Column({ nullable: true })
  passwordResetCode?: string;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  passwordResetCodeExpiresAt?: Date;

  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
