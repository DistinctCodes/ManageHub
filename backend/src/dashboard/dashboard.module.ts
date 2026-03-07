import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { NewsletterSubscriber } from '../newsletter/entities/newsletter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, NewsletterSubscriber])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
