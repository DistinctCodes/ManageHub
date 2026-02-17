import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserMessages } from './user-messages';
import { JwtPayload } from '../interface/user.interface';
import { User } from '../../users/entities/user.entity';

type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

@Injectable()
export class JwtHelper {
  constructor(private readonly jwtService: JwtService) {}

  public validateRefreshToken(refreshToken: string): string | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET as string,
      });

      return payload?.sub ?? null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('JWT verification failed:', error.message);
      } else {
        console.error('JWT verification failed:', error);
      }
      throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
    }
  }

  public generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET as string,
      expiresIn: (process.env.JWT_EXPIRATION ?? '1h') as JwtExpiry,
    });
  }

  public generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET as string,
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION ?? '7d') as JwtExpiry,
    });
  }

  public generateTokens(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
}
