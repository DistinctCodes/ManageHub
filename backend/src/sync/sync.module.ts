import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
@Module({
  providers: [SyncService, SyncScheduler],
  exports: [SyncService],
})
export class SyncModule {} 