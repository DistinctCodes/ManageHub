import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AdminAnalyticsProvider } from './providers/admin-analytics.provider';
import { MemberDashboardProvider } from './providers/member-dashboard.provider';
import { User } from '../users/entities/user.entity';
import { NewsletterSubscriber } from '../newsletter/entities/newsletter.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      NewsletterSubscriber,
      Booking,
      Payment,
      Invoice,
      WorkspaceLog,
      Workspace,
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    AdminAnalyticsProvider,
    MemberDashboardProvider,
  ],
})
export class DashboardModule {}
