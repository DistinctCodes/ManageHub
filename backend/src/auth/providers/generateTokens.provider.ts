import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class GenerateTokensProvider {
  constructor(
    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,
  ) {}

  public async signSingleToken(
    userId: string,
    expiresIn: number,
    userRole: string,
    payload?: any,
  ) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        role: userRole,
        ...payload,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn,
      },
    );
  }

  public async generateBothTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signSingleToken(
        user.id,
        this.configService.get('JWT_ACCESS_EXPIRATION'),
        user.role,
        {
          email: user.email,
        },
      ),
      this.signSingleToken(
        user.id,
        this.configService.get('JWT_REFRESH_EXPIRATION'),
        user.role,
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
