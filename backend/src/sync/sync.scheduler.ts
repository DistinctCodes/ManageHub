import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';
import { BiometricService } from '../biometric/biometric.service';

@Injectable()
export class SyncScheduler {
  constructor(
    private readonly syncService: SyncService,
    private readonly biometricService: BiometricService,
  ) {}

  @Cron('*/5 * * * * *') // every 5 seconds for demo
  async handleSync() {
    const unsynced = this.biometricService.getUnsyncedData();
    for (const record of unsynced) {
      await this.syncService.syncData(record);
      this.biometricService.markDataAsSynced([record.id]);
    }
  }
} 