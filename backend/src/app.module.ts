import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesModule } from './badges/badges.module';
import { InternetSpeedModule } from './internet-speed/internet-speed.module';
import { LibraryService } from './library/library.service';
import { LibraryModule } from './library/library-module.module';
import { DeviceMaintenanceModule } from './device-maintenance/device-maintenance.module';

@Module({
  imports: [BadgesModule, InternetSpeedModule, LibraryModule, PollsModule, LeaveModule, DeviceMaintenanceModule],
  controllers: [AppController],
  providers: [AppService, LibraryService],
})
export class AppModule {}
