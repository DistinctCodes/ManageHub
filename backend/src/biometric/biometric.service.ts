import { Injectable } from '@nestjs/common';
import { BiometricDataEntity } from './biometric.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BiometricService {
  generateDummyRecord(): BiometricDataEntity {
    // Stub: returns a dummy biometric record
    return {
      id: uuidv4(),
      deviceId: `device-${Math.floor(Math.random() * 1000)}`,
      biometricType: ['fingerprint', 'face', 'voice'][Math.floor(Math.random() * 3)] as 'fingerprint' | 'face' | 'voice',
      dataQuality: Math.floor(Math.random() * 100),
      payload: Math.random().toString(36).substring(2),
      generatedAt: new Date(),
    };
  }

  generateBulkRecords(deviceCount: number, frequency: number): BiometricDataEntity[] {
    // Stub: returns an array of dummy records
    return Array.from({ length: deviceCount * frequency }, () => this.generateDummyRecord());
  }
} 