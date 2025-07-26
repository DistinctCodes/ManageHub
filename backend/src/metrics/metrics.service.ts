import { Injectable } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class MetricsService {
  constructor(private readonly loggingService: LoggingService) {}

  getSuccessRate(): number {
    const logs = (this.loggingService as any).logs || [];
    const total = logs.length;
    if (!total) return 0;
    return logs.filter(l => l.status === 'success').length / total;
  }

  getFailureRate(): number {
    const logs = (this.loggingService as any).logs || [];
    const total = logs.length;
    if (!total) return 0;
    return logs.filter(l => l.status === 'failure').length / total;
  }

  getAverageLatency(): number {
    // For demo, return a stub value
    return 100;
  }

  getDeviceSyncHealth(deviceId: string): any {
    const logs = (this.loggingService as any).logs || [];
    const deviceLogs = logs.filter(l => l.deviceId === deviceId);
    return {
      total: deviceLogs.length,
      success: deviceLogs.filter(l => l.status === 'success').length,
      failure: deviceLogs.filter(l => l.status === 'failure').length,
    };
  }
} 