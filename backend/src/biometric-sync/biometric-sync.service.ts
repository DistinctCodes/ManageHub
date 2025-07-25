import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BiometricSyncService {
  private readonly logger = new Logger(BiometricSyncService.name);

  async syncBiometricData(): Promise<{ success: boolean; timestamp: Date; error?: string }> {
    const timestamp = new Date();
    try {
      // Simulate random sync success/failure
      if (Math.random() < 0.8) {
        this.logger.log(`Biometric data synced at ${timestamp.toISOString()}`);
        return { success: true, timestamp };
      } else {
        throw new Error('Simulated sync failure');
      }
    } catch (error) {
      this.logger.error(`Sync failed at ${timestamp.toISOString()}: ${error.message}`);
      return { success: false, timestamp, error: error.message };
    }
  }
} 