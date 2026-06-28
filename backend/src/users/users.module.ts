import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { Referral } from '../referrals/entities/referral.entity';
import { FindOneUserByEmailProvider } from './providers/findOneUserByEmail.provider';
import { FindOneUserByIdProvider } from './providers/findOneUserById.provider';
import { CreateUserProvider } from './providers/createUser.provider';
import { ValidateUserProvider } from './providers/validateUser.provider';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { FindAllUsersProvider } from './providers/findAllUsers.provider';
import { UpdateUserProvider } from './providers/updateUser.provider';
import { DeleteUserProvider } from './providers/deleteUser.provider';
import { UploadProfilePictureProvider } from './providers/uploadProfilePicture.provider';
import { ForgotPasswordProvider } from './providers/forgotPassword.provider';
import { ResetPasswordProvider } from './providers/resetPassword.provider';
import { FindAllAdminsProvider } from './providers/findAllAdmins.provider';
import { FindAdminByIdProvider } from './providers/findAdminById.provider';
import { GetMembersProvider } from './providers/get-members.provider';
import { UpdateMemberStatusProvider } from './providers/update-member-status.provider';
import { GetMemberStatsProvider } from './providers/get-member-stats.provider';
import { GetCommunityMembersProvider } from './providers/get-community-members.provider';
import { GetPublicProfileProvider } from './providers/get-public-profile.provider';
import { MembersController } from './members.controller';
import { CommunityController } from './community.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Referral]),
    forwardRef(() => AuthModule),
    CloudinaryModule,
  ],
  controllers: [UsersController, MembersController, CommunityController],
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
    GetMembersProvider,
    UpdateMemberStatusProvider,
    GetMemberStatsProvider,
    GetCommunityMembersProvider,
    GetPublicProfileProvider,
  ],
  exports: [UsersService],
})
export class UsersModule {}
