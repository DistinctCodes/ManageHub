import { Injectable } from '@nestjs/common';
import { CheckInProvider } from './providers/check-in.provider';
import { OccupancyProvider } from './providers/occupancy.provider';
import { CheckInDto } from './dto/check-in.dto';
import { OccupancyQueryDto } from './dto/occupancy-query.dto';

@Injectable()
export class WorkspaceTrackingService {
  constructor(
    private readonly checkInProvider: CheckInProvider,
    private readonly occupancyProvider: OccupancyProvider,
  ) {}

  checkIn(dto: CheckInDto, userId: string) {
    return this.checkInProvider.checkIn(dto, userId);
  }

  checkOut(logId: string, userId: string) {
    return this.checkInProvider.checkOut(logId, userId);
  }

  getActiveCheckIn(userId: string, workspaceId?: string) {
    return this.checkInProvider.getActiveCheckIn(userId, workspaceId);
  }

  getCurrentOccupancy(workspaceId?: string) {
    return this.occupancyProvider.getCurrentOccupancy(workspaceId);
  }

  getUtilizationStats(query: OccupancyQueryDto) {
    return this.occupancyProvider.getUtilizationStats(query);
  }

  getRecentLogs(workspaceId?: string, limit?: number) {
    return this.occupancyProvider.getRecentLogs(workspaceId, limit);
  }
}
