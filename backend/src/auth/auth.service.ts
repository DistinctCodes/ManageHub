import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { MoreThan, Repository } from 'typeorm';
import { createTransport } from 'nodemailer';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { RequestUser } from './interfaces/authenticated-request.interface';

/**
 * Cost factor every password hash in this service uses (issue #1964). Both
 * the real hashes and the dummy comparison share it, so a lookup hit and a
 * miss cost the same amount of work.
 */
const BCRYPT_ROUNDS = 12;

/**
 * A bcrypt hash produced with the same cost factor as real password hashes.
 *
 * Login uses it to burn the same amount of CPU when the email is unknown as
 * when it is known, so response time stops advertising which addresses have
 * accounts (issue #1964). It is generated on first use from random bytes
 * rather than hardcoded; the plaintext is discarded and never compared
 * against a user, so nothing secret is embedded in the source.
 */
let dummyPasswordHash: Promise<string> | undefined;
function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hash(
    Math.random().toString(36).slice(2),
    BCRYPT_ROUNDS,
  );
  return dummyPasswordHash;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      // Deliberate decision (issue #1964): registration still answers 409
      // for an already-registered address. Responding identically to a
      // brand-new sign-up would mean never issuing a token from /register at
      // all — i.e. an email-verification (or "you already have an account"
      // notification) flow that this codebase does not have yet. Until that
      // lands, the 409 is kept and the login side is hardened against
      // timing-based enumeration. See auth/README.md.
      throw new ConflictException('Email is already registered');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      }),
    );
    return this.issueToken(user);
  }

  /**
   * Authenticates a password login and records the successful-login marker.
   *
   * The write is awaited inline rather than fired and forgotten: a login
   * must not succeed while its security timestamp is still unrecorded, or
   * monitoring could miss the authentication event. If persisting the stamp
   * fails, the error propagates and no token is issued; that explicit failure
   * is safer than silently authenticating a user without an audit record.
   * The field is written only after the password comparison succeeds, so a
   * failed lookup or bad password leaves the user's row untouched.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      // Burn bcrypt-equivalent work against a dummy hash before failing, so
      // an unknown email costs about the same wall-clock time as a known one
      // with a wrong password (issue #1964). Without this, the fast 401 on a
      // missing user (no bcrypt at all) vs the slow 401 on a bad password
      // (~hundreds of ms) lets a caller enumerate registered addresses.
      await compare(dto.password, await getDummyPasswordHash());
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const lastLoginAt = new Date();
    await this.users.update(user.id, { lastLoginAt });
    user.lastLoginAt = lastLoginAt;
    return this.issueToken(user);
  }

  /**
   * Ends the caller's session by bumping their global `tokenVersion`
   * (issue #1965). Because the counter is per user, every previously
   * issued token — including a copy the caller no longer controls — stops
   * verifying, not just the cookie that is being cleared.
   */
  async logout(userId: string): Promise<void> {
    await this.bumpTokenVersion(userId);
  }

  /**
   * "Sign out everywhere": the same counter bump as logout, exposed with
   * the explicit intent of revoking every live session at once.
   */
  async signOutEverywhere(userId: string): Promise<void> {
    await this.bumpTokenVersion(userId);
  }

  /**
   * Changes the password and revokes every existing token in the same
   * write, then returns a freshly-minted token so the caller stays signed
   * in on this device while all others are logged out (issue #1965).
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const ok = await compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await hash(dto.newPassword, 12);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    const saved = await this.users.save(user);
    return this.issueToken(saved);
  }

  async requestPasswordReset(emailAddress: string): Promise<void> {
    const email = emailAddress.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    user.passwordResetTokenHash = this.hashResetToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.save(user);

    const host = this.config.get<string>('SMTP_HOST');
    const username = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM_EMAIL');
    if (!host || !username || !password || !from) return;

    const transport = createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: { user: username, pass: password },
    });
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);
    try {
      await transport.sendMail({
        from,
        to: user.email,
        subject: 'Reset your ManageHub password',
        text: `Use this link to reset your password. It expires in one hour: ${resetUrl.toString()}`,
      });
    } catch (error) {
      this.logger.warn(
        `Unable to send password reset email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashResetToken(dto.token);
    const user = await this.users.findOne({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: MoreThan(new Date()),
      },
    });
    if (!user) {
      throw new UnauthorizedException('Password reset link is invalid or expired');
    }

    const result = await this.users.update(
      {
        id: user.id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: MoreThan(new Date()),
      },
      {
        passwordHash: await hash(dto.newPassword, BCRYPT_ROUNDS),
        tokenVersion: () => '"token_version" + 1',
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    );
    if (!result.affected) {
      throw new UnauthorizedException('Password reset link is invalid or expired');
    }
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Admin role change. A role is baked into the token as a claim, so the
   * version is bumped in the same write to force affected users to
   * re-authenticate and pick up their new role (issue #1965).
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    return this.users.save(user);
  }

  /**
   * Restores the session client-side (issue #1973): the HttpOnly cookie
   * cannot be read by the frontend, so `GET /auth/me` is the only way to
   * learn who is signed in and with which role. A revoked token never gets
   * this far (the guard's verifier rejects it), so a hit means "logged in".
   */
  async me(currentUser: RequestUser): Promise<AuthUserDto> {
    const user = await this.users.findOne({ where: { id: currentUser.id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { id: user.id, email: user.email, role: user.role };
  }

  private async bumpTokenVersion(userId: string): Promise<void> {
    await this.users.increment({ id: userId }, 'tokenVersion', 1);
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
