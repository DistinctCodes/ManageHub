import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { NotificationsModule } from './notifications/notifications.module';
import { BadgesModule } from './badges/badges.module';
import { InternetSpeedModule } from './internet-speed/internet-speed.module';
import { LibraryService } from './library/library.service';
import { LibraryModule } from './library/library-module.module';
import { BusinessesModule } from './businesses/businesses.module';
import { PollsModule } from './polls/polls.module';
import { LeaveModule } from './leave/leave.module';
import { InternalNotesModule } from './internal-notes/internal-notes.module';
import { SystemStatsModule } from './system-stats/system-stats.module';
import { ServiceVendorVisitModule } from './service-vendor-visit/service-vendor-visit.module';
import { BackupsModule } from './backups/backups.module';
import { EnvironmentMonitorModule } from './environment-monitor/environment-monitor.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SettingsModule } from './settings/settings.module';
import { ParkingModule } from './parking/parking.module';
import { SurveysModule } from './surveys/surveys.module';
import { PartnersModule } from './partners/partners.module';
import { DonationsModule } from 'donations/donations.module';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
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
    AuthModule,
    UsersModule,
    EmailModule,
    NewsletterModule,
    NotificationsModule,
    BadgesModule,
    InternetSpeedModule,
    LibraryModule,
    BusinessesModule,
    PollsModule,
    LeaveModule,
    InternalNotesModule,
    SystemStatsModule,
    ServiceVendorVisitModule,
    BackupsModule,
    EnvironmentMonitorModule,
    LeaderboardModule,
    BroadcastModule,
    MonitoringModule,
    SettingsModule,
    ParkingModule,
    SurveysModule,
    PartnersModule,
    DonationsModule,
    InventoryMovementsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
