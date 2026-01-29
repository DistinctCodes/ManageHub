import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class GenerateTokensProvider {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION ?? '15m' },
    );
  }

  async generateRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id },
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION ?? '7d' },
    );
  }

  async generateBothTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return { accessToken, refreshToken };
  }
}
