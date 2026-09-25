import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

  private async issueToken(user: User): Promise<AuthResponseDto> {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
