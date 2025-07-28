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
import { BackupsModule } from './backups/backups.module';


@Module({
  imports: [
    BadgesModule,
    InternetSpeedModule,
    LibraryModule,
    BusinessesModule,
    PollsModule,
    LeaveModule,
    InternalNotesModule,
    SystemStatsModule,
    BackupsModule,
  ],
  controllers: [AppController],
  providers: [AppService, LibraryService],
})
export class AppModule {}