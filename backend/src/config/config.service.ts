import { Injectable } from '@nestjs/common';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class ConfigService {
  private config = {
    deviceCount: 5,
    syncFrequency: 1,
    failureRate: 0.2,
  };

  getConfig() {
    return this.config;
  }

  updateConfig(dto: UpdateConfigDto) {
    this.config = { ...this.config, ...dto };
    return this.config;
  }
} 