import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.register({}),
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
  ],
  exports: [
    AuthService,
    HashingProvider,
    GenerateTokensProvider,
    RefreshTokenRepositoryOperations,
  ],
})
export class AuthModule {}
