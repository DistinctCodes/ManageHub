import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AdminController } from './admin.controller';
import { DemoDataController } from './demo-data.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    UsersModule,
    UserProfileModule,
  ],
  controllers: [AdminController, DemoDataController],
})
export class AdminModule {}
