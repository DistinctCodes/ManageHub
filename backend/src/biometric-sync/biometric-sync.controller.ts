import { Controller, Post } from '@nestjs/common';
import { BiometricSyncService } from './biometric-sync.service';

@Controller('biometric-sync')
export class BiometricSyncController {
  constructor(private readonly biometricSyncService: BiometricSyncService) {}

  @Post('sync')
  async syncBiometricData() {
    return this.biometricSyncService.syncBiometricData();
  }
} 