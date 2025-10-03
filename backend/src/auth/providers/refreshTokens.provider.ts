import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { UsersService } from 'src/users/providers/users.service';
import { RefreshToken } from '../entities/refreshToken.entity';
import { Repository } from 'typeorm';
import { HashingProvider } from './hashing.provider';
import { GenerateTokensProvider } from './generateTokens.provider';
import { RefreshTokenRepositoryOperations } from './RefreshTokenCrud.repository';
import { ConfigService } from '@nestjs/config';
import { AuthResponse } from '../interfaces/authResponse.interface';

@Injectable()
export class RefreshTokensProvider {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly hashingProvider: HashingProvider,

    private readonly generateTokensProvider: GenerateTokensProvider,

    private readonly refreshTokenRepositoryOperations: RefreshTokenRepositoryOperations,

    private readonly configService: ConfigService,
  ) {}

  public async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findUserById(userId);

    // find all the tokens of the user in the database
    const allTokens = await this.refreshTokenRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    let matchingExistingToken: RefreshToken = null;

    for (const token of allTokens) {
      const isMatch = await this.hashingProvider.compare(
        refreshToken,
        token.token,
      );

      if (isMatch) {
        matchingExistingToken = token;
        break;
      }
    }

    if (!matchingExistingToken) {
      throw new ForbiddenException('Access Denied');
    }

    // verify refresh token matches
    const isMatch = await this.hashingProvider.compare(
      refreshToken,
      matchingExistingToken.token,
    );

    if (!isMatch) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const now = new Date();

    // if token has already been revoked
    if (matchingExistingToken.revoked) {
      throw new UnauthorizedException(
        'Token already revoked. Kindly login to get a new refresh token',
      );
    }

    // if refresh token has expired, mark it has revoked and let the user log in again to get a new access and refresh token
    if (matchingExistingToken.expiresAt < now) {
      matchingExistingToken.revoked = true;
      matchingExistingToken.revokedAt = now;
      await this.refreshTokenRepository.save(matchingExistingToken);

      throw new UnauthorizedException(
        'Your session has expired. Please login again',
      );

      // Then in the frontend, when you get a 401 Unauthorized from /refresh-token, redirect user to login.
    }

    // if refresh token is still valid, generate only access token
    if (matchingExistingToken.expiresAt > now) {
      const newAccessToken = await this.generateTokensProvider.signSingleToken(
        user.id,
        this.configService.get('JWT_ACCESS_EXPIRATION'),
        user.role,
        {
          email: user.email,
        },
      );

      return {
        user,
        accessToken: newAccessToken,
      };
    }

    // generate new tokens if the refresh token has expired
    // const newTokens =
    //   await this.generateTokensProvider.generateBothTokens(user);

    // const hashedNewRefreshToken = await this.hashingProvider.hashPassword(
    //   newTokens.refreshToken,
    // );

    // const newRefreshTokenEntity = this.refreshTokenRepository.create({
    //   token: hashedNewRefreshToken,
    //   expiresAt: new Date(Date.now() + this.jwtConfiguration.refreshTokenTTL),
    //   user: user,
    //   userId: userId,
    //   userAgent: req.headers['user-agent'] || '',
    //   ipAddress: req.ip,
    // });

    // await this.refreshTokenRepository.save(newRefreshTokenEntity);

    // return {
    //   user,
    //   accessToken: newTokens.accessToken,
    //   refreshToken: newTokens.refreshToken,
    // };
  }
}
