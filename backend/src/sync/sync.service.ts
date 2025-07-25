import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { BiometricDataEntity } from '../biometric/biometric.entity';
import { ErrorSimulatorService } from '../errors/error-simulator.service';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly errorSimulator: ErrorSimulatorService,
    private readonly loggingService: LoggingService,
  ) {}

  async syncData(data: BiometricDataEntity): Promise<void> {
    let attempts = 0;
    let success = false;
    let errorType = '';
    while (!success && attempts < 3) {
      attempts++;
      const error = this.errorSimulator.simulateError();
      if (error) {
        errorType = error.type;
        await this.loggingService.logSyncResult(data.deviceId, new Date(), 'failure', errorType, attempts);
        await new Promise(res => setTimeout(res, 100 * attempts)); // Exponential backoff
      } else {
        success = true;
        await this.loggingService.logSyncResult(data.deviceId, new Date(), 'success', undefined, attempts);
      }
    }
  }
} 