import { Module } from '@nestjs/common';
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
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkspaceTrackingModule } from './workspace-tracking/workspace-tracking.module';
import { ResourcesModule } from './resources/resources.module';
import { HubSettingsModule } from './hub-settings/hub-settings.module';
import { MembershipPlansModule } from './membership-plans/membership-plans.module';
import { ParkingModule } from './parking/parking.module';
import { VisitorsModule } from './visitors/visitors.module';
import { JobsModule } from './jobs/jobs.module';
import { createNestDatabaseOptions } from './database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short',      ttl: 1000,   limit: 3   },
      { name: 'medium',     ttl: 10000,  limit: 20  },
      { name: 'long',       ttl: 60000,  limit: 100 },
      { name: 'newsletter', ttl: 60_000, limit: 10  },
      { name: 'contact',    ttl: 60_000, limit: 5   },
      { name: 'feedback',   ttl: 60_000, limit: 10  },
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
      useFactory: (configService: ConfigService) =>
        createNestDatabaseOptions({
          ...process.env,
          DATABASE_HOST: configService.get<string>('DATABASE_HOST'),
          DATABASE_PORT: configService.get<string>('DATABASE_PORT'),
          DATABASE_USERNAME: configService.get<string>('DATABASE_USERNAME'),
          DATABASE_PASSWORD: configService.get<string>('DATABASE_PASSWORD'),
          DATABASE_NAME: configService.get<string>('DATABASE_NAME'),
          DATABASE_SSL: configService.get<string>('DATABASE_SSL'),
          PGSSLMODE: configService.get<string>('PGSSLMODE'),
          NODE_ENV: configService.get<string>('NODE_ENV'),
        }),
    }),
    EmailModule,
    AuthModule,
    UsersModule,
    NewsletterModule,
    ContactModule,
    DashboardModule,
    WorkspacesModule,
    BookingsModule,
    PaymentsModule,
    InvoicesModule,
    NotificationsModule,
    WorkspaceTrackingModule,
    ResourcesModule,
    HubSettingsModule,
    MembershipPlansModule,
    ParkingModule,
    VisitorsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
