// backend/src/auth/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MembershipType {
  HOT_DESK = 'hot-desk',
  DEDICATED = 'dedicated',
  PRIVATE_OFFICE = 'private-office',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'pending-verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum UserRole {
  MEMBER = 'member',
  RECEPTIONIST = 'receptionist',
  MANAGER = 'manager',
  SUPER_ADMIN = 'super-admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: MembershipType,
    default: MembershipType.HOT_DESK,
  })
  membershipType: MembershipType;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profilePicture: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stellarWalletAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qrCode: string | null;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiry: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiry: Date | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twoFactorSecret: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
