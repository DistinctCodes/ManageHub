import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ErrorSimulatorService {
  constructor(private readonly configService: ConfigService) {}

  simulateError(): { type: string; message: string } | null {
    const failureRate = this.configService.getConfig().failureRate || 0.2;
    if (Math.random() < failureRate) {
      const errorTypes = [
        { type: 'timeout', message: 'Sync timed out' },
        { type: 'corruption', message: 'Data corruption detected' },
        { type: 'repository', message: 'Repository failure' },
      ];
      return errorTypes[Math.floor(Math.random() * errorTypes.length)];
    }
    return null;
  }
} 