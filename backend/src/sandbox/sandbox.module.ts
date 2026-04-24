import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import { BookingReminderService } from './booking-reminder.service';
import { ActivityScoreService } from './activity-score.service';
import { ActivityScoreController } from './activity-score.controller';
import { WorkspaceFilterService } from './workspace-filter.service';
import { WorkspaceFilterController } from './workspace-filter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceLog, Booking, Workspace])],
  controllers: [
    StreakController,
    ActivityScoreController,
    WorkspaceFilterController,
  ],
  providers: [
    StreakService,
    BookingReminderService,
    ActivityScoreService,
    WorkspaceFilterService,
  ],
})
export class SandboxModule {}
