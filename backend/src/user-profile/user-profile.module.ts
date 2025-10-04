import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { UserProfileSeederService } from './user-profile-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CloudinaryModule],
  controllers: [UserProfileController],
  providers: [UserProfileService, UserProfileSeederService],
  exports: [UserProfileService, UserProfileSeederService],
})
export class UserProfileModule {}
