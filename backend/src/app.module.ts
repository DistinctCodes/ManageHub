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
import { BiometricModule } from './biometric/biometric.module';
import { SyncModule } from './sync/sync.module';
import { ErrorSimulationModule } from './errors/error-simulator.module';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BiometricModule,
    SyncModule,
    ErrorSimulationModule,
    LoggingModule,
    MetricsModule,
    ConfigModule,
    BadgesModule,
    InternetSpeedModule,
    LibraryModule,
    PollsModule,
    LeaveModule,
    BiometricSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
