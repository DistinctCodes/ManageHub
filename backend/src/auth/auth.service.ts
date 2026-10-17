import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await hash(dto.password, 12),
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
    const saved = await this.users.save(user);
    return this.issueToken(saved);
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
