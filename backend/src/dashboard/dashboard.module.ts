import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AdminAnalyticsProvider } from './providers/admin-analytics.provider';
import { MemberDashboardProvider } from './providers/member-dashboard.provider';
import { User } from '../users/entities/user.entity';
import { NewsletterSubscriber } from '../newsletter/entities/newsletter.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../payments/entities/invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Payment, Invoice, WorkspaceLog, Workspace, User, NewsletterSubscriber])],
  controllers: [DashboardController],
  providers: [DashboardService, AdminAnalyticsProvider, MemberDashboardProvider],
})
export class DashboardModule {}
