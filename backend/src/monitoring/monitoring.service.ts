import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MonitoringService {
  constructor(private dataSource: DataSource) {}

  async getStatus() {
    // DB check
    let dbStatus = 'unknown';
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'up';
    } catch (e) {
      dbStatus = 'down';
    }

    // Add more critical service checks here as needed
    // Example: Redis, external APIs, etc.

    return {
      database: dbStatus,
      // Add other services here
    };
  }
}
