import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RefreshToken } from '../../auth/entities/refreshToken.entity';
import { UserRole } from '../enums/userRoles.enum';
import { MembershipStatus } from '../enums/membership-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  membershipStatus: MembershipStatus;

  @Exclude()
  @Column({ nullable: true })
  passwordResetToken?: string;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresIn?: Date;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  lastPasswordResetSentAt?: Date;

  @Exclude()
  @Column({ nullable: true })
  verificationToken?: string;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  verificationTokenExpiry?: Date;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  lastVerificationEmailSent?: Date;

  @Exclude()
  @Column({ nullable: true })
  verificationCode?: string;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeExpiresAt?: Date;

  @Exclude()
  @Column({ nullable: true })
  passwordResetCode?: string;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetCodeExpiresAt?: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: false })
  isSuspended: boolean;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  profilePicture?: string;

  @Column({ nullable: true, type: 'varchar', length: 15 })
  phone?: string;

  @Exclude()
  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Exclude()
  @Column({ nullable: true, type: 'varchar', length: 255 })
  totpSecret?: string | null;

  @Exclude()
  @Column({ type: 'jsonb', nullable: true })
  totpBackupCodes?: string[] | null;

  @DeleteDateColumn()
  deletedAt: Date;
  get fullName(): string {
    return `${this.firstname} ${this.lastname}`.trim();
  }
}
