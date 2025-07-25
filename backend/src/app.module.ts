import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesModule } from './badges/badges.module';
import { InternetSpeedModule } from './internet-speed/internet-speed.module';
import { LibraryService } from './library/library.service';
import { LibraryModule } from './library/library-module.module';
import { BiometricSyncModule } from './biometric-sync/biometric-sync.module';
import { PollsModule } from './polls/polls.module';
import { LeaveModule } from './leave/leave.module';

@Module({
  imports: [BadgesModule, InternetSpeedModule, LibraryModule, PollsModule, LeaveModule, BiometricSyncModule],
  controllers: [AppController],
  providers: [AppService, LibraryService],
})
export class AppModule {}
