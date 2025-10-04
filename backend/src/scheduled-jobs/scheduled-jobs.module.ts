import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  providers: [ScheduledJobsService]
})
export class ScheduledJobsModule {}
