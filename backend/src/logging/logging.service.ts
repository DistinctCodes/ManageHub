import { Injectable } from '@nestjs/common';
import { SyncLogEntity } from './log.entity';
import { QueryLogsDto } from './dto/query-logs.dto';

@Injectable()
export class LoggingService {
  private logs: SyncLogEntity[] = [];

  async logSyncResult(deviceId: string, timestamp: Date, status: 'success' | 'failure', errorType?: string, attempts = 1) {
    this.logs.push({
      id: (this.logs.length + 1).toString(),
      deviceId,
      timestamp,
      status,
      errorType,
      attempts,
    });
  }

  async getLogs(query: QueryLogsDto): Promise<{ data: SyncLogEntity[]; total: number }> {
    let filtered = this.logs;
    if (query.deviceId) filtered = filtered.filter(l => l.deviceId === query.deviceId);
    if (query.status) filtered = filtered.filter(l => l.status === query.status);
    const total = filtered.length;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const data = filtered.slice((page - 1) * limit, page * limit);
    return { data, total };
  }
} 