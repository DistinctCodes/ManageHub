import { Module } from '@nestjs/common';
import { BiometricSyncService } from './biometric-sync.service';
import { BiometricSyncController } from './biometric-sync.controller';

@Module({
  providers: [BiometricSyncService],
  controllers: [BiometricSyncController],
})
export class BiometricSyncModule {} 