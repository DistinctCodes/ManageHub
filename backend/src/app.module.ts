import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guard/jwt.auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsletterModule } from './newsletter/newsletter.module';
import { EmailModule } from './email/email.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ContactModule } from './contact/contact.module';
import { SupportModule } from './support/support.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkspaceTrackingModule } from './workspace-tracking/workspace-tracking.module';
import { HubSettingsModule } from './hub-settings/hub-settings.module';
import { VisitorsModule } from './visitors/visitors.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AccessControlModule } from './access-control/access-control.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { EventsModule } from './events/events.module';
import { MembershipPlansModule } from './membership-plans/membership-plans.module';
import { ContractsModule } from './contracts/contracts.module';
import { ShiftsModule } from './shifts/shifts.module';
import { BillingModule } from './billing/billing.module';
import { DunningModule } from './dunning/dunning.module';
import { ShiftsModule } from './shifts/shifts.module';
import { FloorPlanModule } from './floor-plan/floor-plan.module';
import { ReportsModule } from './reports/reports.module';
import { EmailCampaignsModule } from './email-campaigns/email-campaigns.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { LockersModule } from './lockers/lockers.module';
import { PackagesModule } from './packages/packages.module';
import { ReferralsModule } from './referrals/referrals.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { LeadsModule } from './leads/leads.module';
import { CreditsModule } from './credits/credits.module';
import { TeamsModule } from './teams/teams.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
      { name: 'newsletter', ttl: 60_000, limit: 10 },
      { name: 'contact', ttl: 60_000, limit: 5 },
      { name: 'feedback', ttl: 60_000, limit: 10 },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const tls = configService.get<string>('REDIS_TLS') === 'true';
        return {
          redis: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: configService.get<string>('REDIS_PASSWORD'),
            db: configService.get<number>('REDIS_DB') || 0,
            ...(tls && { tls: {} }),
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DATABASE_HOST');
        const sslRequired =
          configService.get<string>('NODE_ENV') === 'production' ||
          configService.get<string>('PGSSLMODE') === 'require' ||
          configService.get<string>('DATABASE_SSL') === 'true' ||
          (host ? host.includes('neon.tech') : false);
        return {
          type: 'postgres',
          database: configService.get('DATABASE_NAME'),
          password: configService.get('DATABASE_PASSWORD'),
          username: configService.get('DATABASE_USERNAME'),
          port: +configService.get('DATABASE_PORT'),
          host,
          autoLoadEntities: true,
          synchronize: true,
          ssl: sslRequired ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    EmailModule,
    AuthModule,
    UsersModule,
    NewsletterModule,
    ContactModule,
    DashboardModule,
    SupportModule,
    WorkspacesModule,
    BookingsModule,
    PaymentsModule,
    InvoicesModule,
    NotificationsModule,
    WorkspaceTrackingModule,
    HubSettingsModule,
    VisitorsModule,
    PromoCodesModule,
    AnnouncementsModule,
    AccessControlModule,
    WaitlistModule,
    EventsModule,
    MembershipPlansModule,
    ContractsModule,
    ShiftsModule,
    BillingModule,
    DunningModule,
    ShiftsModule,
    FloorPlanModule,
    ReportsModule,
    EmailCampaignsModule,
    InventoryModule,
    AuditLogModule,
    LockersModule,
    PackagesModule,
    ReferralsModule,
    MaintenanceModule,
    LeadsModule,
    CreditsModule,
    TeamsModule,
    ResourcesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
