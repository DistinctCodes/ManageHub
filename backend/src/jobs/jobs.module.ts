import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StaleCheckinJob } from './stale-checkin.job';

/**
 * Shared background-jobs module (BE-03).
 *
 * Register all scheduled jobs here. Each job is an @Injectable() that
 * uses @Cron() decorators from @nestjs/schedule — no additional setup
 * required beyond importing this module in AppModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceLog]),
    NotificationsModule,
  ],
  providers: [StaleCheckinJob],
})
export class JobsModule {}