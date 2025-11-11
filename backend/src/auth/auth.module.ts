import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refreshToken.entity';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './providers/auth.service';
import { UsersModule } from '../users/users.module';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwtRefresh.strategy';
import { LoginUserProvider } from './providers/loginUser.provider';
import { GenerateTokensProvider } from './providers/generateTokens.provider';
import { RefreshTokensProvider } from './providers/refreshTokens.provider';
import { RefreshTokenRepositoryOperations } from './providers/RefreshTokenCrud.repository';
import { FindOneRefreshTokenProvider } from './providers/findOneRefreshToken.provider';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { VerifyEmailProvider } from './providers/verifyEmail.provider';
import { ResendVerificationEmailProvider } from './providers/resendVerificationEmail.provider';
// import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, User]),
    forwardRef(() => UsersModule),
    // EmailModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    LoginUserProvider,
    GenerateTokensProvider,
    RefreshTokensProvider,
    RefreshTokenRepositoryOperations,
    FindOneRefreshTokenProvider,
    VerifyEmailProvider,
    ResendVerificationEmailProvider,
  ],
  exports: [
    AuthService,
    HashingProvider,
    GenerateTokensProvider,
    RefreshTokensProvider,
    RefreshTokenRepositoryOperations,
    FindOneRefreshTokenProvider,
  ],
})
export class AuthModule {}
