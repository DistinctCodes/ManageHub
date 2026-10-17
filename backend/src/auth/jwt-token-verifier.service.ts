import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestUser } from './interfaces/authenticated-request.interface';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

interface JwtPayload {
  sub: string;
  role: RequestUser['role'];
  tokenVersion?: number;
}

@Injectable()
export class JwtTokenVerifierService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * Verifies the signature and expiry, then confirms the token's
   * `tokenVersion` claim still matches the user's current counter. A token
   * copied before a logout, password change or role change carries a stale
   * version and is rejected here even though its signature is valid
   * (issue #1965). Tokens minted before this claim existed are treated as
   * version 0, so a pending bump still invalidates them.
   */
  async verify(token: string): Promise<RequestUser> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Token subject no longer exists');
    }

    const tokenVersion = payload.tokenVersion ?? 0;
    if (tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return { id: user.id, role: payload.role ?? UserRole.USER };
  }
}
