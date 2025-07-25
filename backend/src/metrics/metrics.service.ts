import { Injectable } from '@nestjs/common';
@Injectable()
export class MetricsService {
  getSuccessRate(): number { return 0; }
  getFailureRate(): number { return 0; }
  getAverageLatency(): number { return 0; }
  getDeviceSyncHealth(deviceId: string): any { return {}; }
} 