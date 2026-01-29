import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refreshToken.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RefreshTokenRepositoryOperations {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async saveRefreshToken(user: User, token: string): Promise<RefreshToken> {
    const expiresAt = this.computeExpiryFromEnv();

    const rt = this.repo.create({
      userId: user.id,
      token,
      expiresAt,
      revoked: false,
    });

    return this.repo.save(rt);
  }

  async revokeToken(token: string): Promise<void> {
    await this.repo.update({ token }, { revoked: true });
  }

  async findValidToken(token: string): Promise<RefreshToken | null> {
    const rt = await this.repo.findOne({ where: { token } });
    if (!rt) return null;
    if (rt.revoked) return null;
    if (rt.expiresAt && rt.expiresAt < new Date()) return null;
    return rt;
  }

  private computeExpiryFromEnv(): Date | undefined {
    // supports ms number or '7d' etc? We'll keep ms for now.
    const raw = process.env.JWT_REFRESH_EXPIRATION;
    if (!raw) return undefined;

    const ms = Number(raw);
    if (Number.isFinite(ms) && ms > 0) {
      return new Date(Date.now() + ms);
    }
    return undefined;
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.repo.update({ userId }, { revoked: true });
  }
}
