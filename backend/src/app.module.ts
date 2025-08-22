import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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

@Module({
  imports: [
    ScheduleModule.forRoot(),

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
    DonationsModule
  ],
  controllers: [AppController],
  providers: [AppService, LibraryService],
})
export class AppModule {}
