import { Module } from '@nestjs/common';
import { BackupLoggerService } from './backup-logger.service';

@Module({
  providers: [BackupLoggerService],
})
export class BackupsModule {}
