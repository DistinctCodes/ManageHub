import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refreshToken.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './providers/auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    forwardRef(() => UsersModule)
  ],
  controllers: [AuthController],
  providers: [AuthService,    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },],
  exports: [AuthService]
})
export class AuthModule {}
