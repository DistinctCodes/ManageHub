import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BackupLoggerService {
  private readonly logger = new Logger(BackupLoggerService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  simulateBackupJob() {
    const now = new Date();
    const status = Math.random() < 0.9 ? 'SUCCESS' : 'FAILED'; // 90% success rate
    const size = (Math.random() * 500 + 100).toFixed(2); // 100MB–600MB
    const jobName = `NightlyBackup_${now.toISOString().split('T')[0]}`;

    this.logger.log(
      `[${status}] Backup "${jobName}" completed at ${now.toLocaleString()} — ${size}MB`
    );
  }
}