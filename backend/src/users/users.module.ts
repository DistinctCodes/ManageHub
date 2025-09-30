import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { FindOneUserByEmailProvider } from './providers/findOneUserByEmail.provider';
import { FindOneUserByIdProvider } from './providers/findOneUserById.provider';
import { CreateUserProvider } from './providers/createUser.provider';
import { ValidateUserProvider } from './providers/validateUser.provider';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule), CloudinaryModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    FindOneUserByEmailProvider,
    FindOneUserByIdProvider,
    CreateUserProvider,
    ValidateUserProvider,
  ],
  exports: [UsersService],
})
export class UsersModule {}
