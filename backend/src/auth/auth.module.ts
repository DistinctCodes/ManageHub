import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserHelper } from './helper/user-helper';
import { JwtHelper } from './helper/jwt-helper';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from './guard/roles.guard';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { HashingProvider } from './providers/hashing.provider';
import { GenerateTokensProvider } from './providers/generateTokens.provider';
import { RefreshTokenRepositoryOperations } from './providers/refreshToken.repository';
import { RefreshToken } from './entities/refreshToken.entity';
import { SetupTotpProvider } from './providers/setup-totp.provider';
import { VerifyTotpProvider } from './providers/verify-totp.provider';
import { ManageTotpProvider } from './providers/manage-totp.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ??
            '7d') as any,
        },
      }),
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserHelper,
    JwtHelper,
    JwtStrategy,
    RolesGuard,
    HashingProvider,
    GenerateTokensProvider,
    RefreshTokenRepositoryOperations,
    SetupTotpProvider,
    VerifyTotpProvider,
    ManageTotpProvider,
  ],
  exports: [
    AuthService,
    HashingProvider,
    GenerateTokensProvider,
    RefreshTokenRepositoryOperations,
  ],
})
export class AuthModule {}
