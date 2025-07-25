import { Injectable } from '@nestjs/common';
import { BiometricDataEntity } from '../biometric/biometric.entity';
@Injectable()
export class SyncService {
  async syncData(data: BiometricDataEntity): Promise<void> {
    // Stub: Simulate sync logic
  }
  // Add retry logic and error simulation hooks here
} 