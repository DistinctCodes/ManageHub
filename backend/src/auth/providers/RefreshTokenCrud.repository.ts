import {
  BadRequestException,
  Inject,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refreshToken.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { HashingProvider } from './hashing.provider';
import { FindOneRefreshTokenProvider } from './findOneRefreshToken.provider';

@Injectable()
export class RefreshTokenRepositoryOperations {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenEntity: Repository<RefreshToken>,

    private readonly configService: ConfigService,

    private readonly hashingProvider: HashingProvider,

    private readonly findOneRefreshTokenProvider: FindOneRefreshTokenProvider,
  ) {}

  // [1] save the refresh token to the databse
  public async saveRefreshToken(
    user: User,
    token: string,
    req?: Request,
  ): Promise<RefreshToken> {
    let savedRefreshTokenEntity: RefreshToken;

    let raw = this.configService.get<string>('JWT_REFRESH_EXPIRATION'); // e.g. "604800" or "604800000"
    let expirationSeconds: number;

    if (parseInt(raw) > 1000000) {
      // looks like milliseconds
      expirationSeconds = Math.floor(parseInt(raw) / 1000);
    } else {
      // already seconds
      expirationSeconds = parseInt(raw);
    }

    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    const refreshTokenEntityData: Partial<RefreshToken> = {
      user,
      token: await this.hashingProvider.hash(token),
      expiresAt,
    };

    // conditionally add the metadata fileds
    if (req) {
      refreshTokenEntityData.userAgent = req.headers['user-agent'] || 'unknown';
      refreshTokenEntityData.ipAddress = req.ip || 'unknown';
    }

    // create a new refresh token entity
    savedRefreshTokenEntity = this.refreshTokenEntity.create(
      refreshTokenEntityData,
    );

    try {
      savedRefreshTokenEntity = await this.refreshTokenEntity.save(
        savedRefreshTokenEntity,
      );
    } catch (error) {
      throw new RequestTimeoutException('Error connecting to the database');
    }

    if (!savedRefreshTokenEntity) {
      throw new BadRequestException('Error saving refresh token to database');
    }

    return savedRefreshTokenEntity;
  }

  // [2] find one refresh token from the database and return it
  public async findOneRefreshToken(userId: string, userToken: string) {
    const refreshToken =
      await this.findOneRefreshTokenProvider.findRefreshToken(
        userId,
        userToken,
      );

    return refreshToken;
  }

  // [3] invalidate/revoke a refresh token entity
  public async revokeSingleRefreshToken(userId: string, userToken: string) {
    let refreshToken: RefreshToken;

    refreshToken = await this.findOneRefreshTokenProvider.findRefreshToken(
      userId,
      userToken,
    );

    const now = new Date();

    refreshToken.revoked = true;
    refreshToken.revokedAt = now;
    await this.refreshTokenEntity.save(refreshToken);

    return {
      loggedOut: true,
      refreshToken,
    };
  }

  // [4] invalidate/revoke all refresh token entity of the user
  public async revokeAllRefreshTokens(userId: string) {
    const allRefreshTokenEntities = await this.refreshTokenEntity.find({
      where: {
        user: {
          id: userId,
        },
        revoked: false,
      },
    });

    const now = new Date();

    const revokedTokens = allRefreshTokenEntities.map((token) => {
      ((token.revoked = true), (token.revokedAt = now));
      return token;
    });

    await this.refreshTokenEntity.save(revokedTokens);

    return {
      revokedAllSessions: true,
    };
  }
}
