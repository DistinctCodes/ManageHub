import { Injectable } from '@nestjs/common';
import { BiometricDataEntity } from './biometric.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateBiometricDto } from './dto/create-biometric.dto';

@Injectable()
export class BiometricService {
  private data: BiometricDataEntity[] = [];
  private simulationActive = false;
  private interval: NodeJS.Timeout | null = null;

  startSimulation(deviceCount: number, frequency: number) {
    if (this.simulationActive) return;
    this.simulationActive = true;
    this.interval = setInterval(() => {
      this.generateBulkRecords(deviceCount, frequency);
    }, 1000);
  }

  stopSimulation() {
    this.simulationActive = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  generateDummyRecord(): BiometricDataEntity {
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
    const records = Array.from({ length: deviceCount * frequency }, () => this.generateDummyRecord());
    this.data.push(...records);
    return records;
  }

  getUnsyncedData(): BiometricDataEntity[] {
    // For now, return all data (stub for unsynced logic)
    return this.data;
  }

  markDataAsSynced(ids: string[]) {
    // Remove synced data from in-memory array
    this.data = this.data.filter(d => !ids.includes(d.id));
  }

  create(dto: CreateBiometricDto): BiometricDataEntity {
    const record: BiometricDataEntity = {
      id: uuidv4(),
      ...dto,
      generatedAt: new Date(),
    };
    this.data.push(record);
    return record;
  }
} 