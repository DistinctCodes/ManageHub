import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';
@Injectable()
export class SyncScheduler {
  constructor(private readonly syncService: SyncService) {}
  @Cron('*/5 * * * * *') // every 5 seconds for demo
  async handleSync() {
    // Stub: Fetch unsynced biometric data and call syncService.syncData
  }
} 