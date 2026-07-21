import { Injectable } from '@nestjs/common';
import { CheckInProvider } from './providers/check-in.provider';
import { OccupancyProvider } from './providers/occupancy.provider';
import { AttendanceProvider } from './providers/attendance.provider';
import { CheckInDto } from './dto/check-in.dto';
import { OccupancyQueryDto } from './dto/occupancy-query.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

@Injectable()
export class WorkspaceTrackingService {
  constructor(
    private readonly checkInProvider: CheckInProvider,
    private readonly occupancyProvider: OccupancyProvider,
    private readonly attendanceProvider: AttendanceProvider,
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

  // ── Attendance history ──────────────────────────────────────────────────────

  getMemberAttendanceHistory(userId: string, query: AttendanceQueryDto) {
    return this.attendanceProvider.getMemberHistory(userId, query);
  }

  getMemberAttendanceSummary(userId: string) {
    return this.attendanceProvider.getMemberSummary(userId);
  }

  getAdminAttendanceReport(query: AttendanceQueryDto) {
    return this.attendanceProvider.getAdminReport(query);
  }
}