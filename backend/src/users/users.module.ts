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
import { EmailModule } from '../email/email.module';

import { FindAllUsersProvider } from './providers/findAllUsers.provider';
import { UpdateUserProvider } from './providers/updateUser.provider';
import { DeleteUserProvider } from './providers/deleteUser.provider';
import { UploadProfilePictureProvider } from './providers/uploadProfilePicture.provider';
import { ForgotPasswordProvider } from './providers/forgotPassword.provider';
import { ResetPasswordProvider } from './providers/resetPassword.provider';
import { FindAllAdminsProvider } from './providers/findAllAdmins.provider';
import { FindAdminByIdProvider } from './providers/findAdminById.provider';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule), CloudinaryModule, EmailModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    CreateUserProvider,
    FindOneUserByEmailProvider,
    FindOneUserByIdProvider,
    ValidateUserProvider,
    FindAllUsersProvider,
    UpdateUserProvider,
    DeleteUserProvider,
    UploadProfilePictureProvider,
    ForgotPasswordProvider,
    ResetPasswordProvider,
    FindAllAdminsProvider,
    FindAdminByIdProvider,
  ],
  exports: [UsersService],
})
export class UsersModule {}
