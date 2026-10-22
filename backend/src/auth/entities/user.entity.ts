import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /**
   * Invalidation counter embedded in every issued JWT (issue #1965).
   * `JwtTokenVerifierService` rejects any token whose `tokenVersion` claim
   * does not match this row, so bumping the value revokes every token
   * already in circulation for the user. It is raised on logout, on a
   * password change and on a role change — a copied token cannot outlive
   * the event that should have ended its session.
   */
  @Column({ type: 'int', name: 'token_version', default: 0 })
  tokenVersion: number;

  @Column({ type: 'varchar', name: 'password_reset_token_hash', nullable: true })
  passwordResetTokenHash: string | null;

  @Column({ type: 'timestamptz', name: 'password_reset_expires_at', nullable: true })
  passwordResetExpiresAt: Date | null;

  /**
   * Timestamp of the most recent successful password login. This is written
   * only by AuthService.login after password comparison succeeds — never on
   * registration and never for an unknown account or a bad password. A
   * failed attempt must not alter the account's own security history, and
   * must not update the row before authentication has succeeded.
   */
  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
