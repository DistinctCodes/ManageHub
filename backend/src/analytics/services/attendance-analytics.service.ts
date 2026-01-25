import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../../attendance/entities/attendance.entity';
import {
  AttendanceMetrics,
  AttendanceTrend,
  HourlyDistribution,
  DailyDistribution,
  AggregationPeriod,
} from '../types/analytics.types';

@Injectable()
export class AttendanceAnalyticsService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async getAttendanceMetrics(
    startDate: Date,
    endDate: Date,
    aggregation: AggregationPeriod = 'daily',
    staffId?: string,
  ): Promise<AttendanceMetrics> {
    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.staff', 'staff')
      .where('attendance.clockIn BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (staffId) {
      queryBuilder.andWhere('staff.id = :staffId', { staffId });
    }

    const attendanceRecords = await queryBuilder.getMany();

    const totalCheckIns = attendanceRecords.length;
    const totalCheckOuts = attendanceRecords.filter(
      (a) => a.clockOut !== null,
    ).length;

    // Calculate average work hours
    const completedRecords = attendanceRecords.filter(
      (a) => a.totalHours !== null,
    );
    const averageWorkHours =
      completedRecords.length > 0
        ? completedRecords.reduce((sum, a) => sum + Number(a.totalHours), 0) /
          completedRecords.length
        : 0;

    // Calculate attendance rate (based on expected vs actual)
    const attendanceRate = this.calculateAttendanceRate(
      attendanceRecords,
      startDate,
      endDate,
    );

    // Get trends based on aggregation period
    const trends = await this.getAttendanceTrends(
      startDate,
      endDate,
      aggregation,
      staffId,
    );

    // Calculate peak hours
    const peakHours = this.calculatePeakHours(attendanceRecords);

    // Calculate peak days
    const peakDays = this.calculatePeakDays(attendanceRecords);

    // Calculate late arrivals and early departures (placeholder logic)
    const lateArrivals = 0; // Would need shift data to calculate properly
    const earlyDepartures = 0;

    return {
      totalCheckIns,
      totalCheckOuts,
      averageWorkHours: Math.round(averageWorkHours * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      lateArrivals,
      earlyDepartures,
      trends,
      peakHours,
      peakDays,
    };
  }

  private calculateAttendanceRate(
    records: Attendance[],
    startDate: Date,
    endDate: Date,
  ): number {
    // Calculate working days in the period
    const workingDays = this.getWorkingDaysBetween(startDate, endDate);
    if (workingDays === 0) return 0;

    // Get unique staff IDs and their attendance days
    const staffAttendance = new Map<string, Set<string>>();
    records.forEach((record) => {
      if (record.staff) {
        const staffId = record.staff.id;
        const dateKey = record.clockIn.toISOString().split('T')[0];
        if (!staffAttendance.has(staffId)) {
          staffAttendance.set(staffId, new Set());
        }
        staffAttendance.get(staffId)!.add(dateKey);
      }
    });

    if (staffAttendance.size === 0) return 0;

    // Calculate average attendance rate across all staff
    let totalAttendanceRate = 0;
    staffAttendance.forEach((dates) => {
      totalAttendanceRate += (dates.size / workingDays) * 100;
    });

    return totalAttendanceRate / staffAttendance.size;
  }

  private getWorkingDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  private async getAttendanceTrends(
    startDate: Date,
    endDate: Date,
    aggregation: AggregationPeriod,
    staffId?: string,
  ): Promise<AttendanceTrend[]> {
    const dateFormat = this.getDateFormatForAggregation(aggregation);

    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .select(`TO_CHAR(attendance.clockIn, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'checkIns')
      .addSelect(
        'COUNT(CASE WHEN attendance.clockOut IS NOT NULL THEN 1 END)',
        'checkOuts',
      )
      .addSelect('AVG(attendance.totalHours)', 'averageHours')
      .where('attendance.clockIn BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(`TO_CHAR(attendance.clockIn, '${dateFormat}')`)
      .orderBy('date', 'ASC');

    if (staffId) {
      queryBuilder
        .leftJoin('attendance.staff', 'staff')
        .andWhere('staff.id = :staffId', { staffId });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((row) => ({
      date: row.date,
      checkIns: parseInt(row.checkIns, 10),
      checkOuts: parseInt(row.checkOuts, 10),
      averageHours: parseFloat(row.averageHours) || 0,
      attendanceRate: 0, // Would need total staff count to calculate
    }));
  }

  private getDateFormatForAggregation(aggregation: AggregationPeriod): string {
    switch (aggregation) {
      case 'daily':
        return 'YYYY-MM-DD';
      case 'weekly':
        return 'IYYY-IW';
      case 'monthly':
        return 'YYYY-MM';
      case 'yearly':
        return 'YYYY';
      default:
        return 'YYYY-MM-DD';
    }
  }

  private calculatePeakHours(records: Attendance[]): HourlyDistribution[] {
    const hourCounts = new Map<number, number>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    // Count check-ins by hour
    records.forEach((record) => {
      const hour = record.clockIn.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const total = records.length || 1;

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({
        hour,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculatePeakDays(records: Attendance[]): DailyDistribution[] {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayCounts = new Map<number, number>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayCounts.set(i, 0);
    }

    // Count check-ins by day of week
    records.forEach((record) => {
      const day = record.clockIn.getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const total = records.length || 1;

    return Array.from(dayCounts.entries())
      .map(([dayOfWeek, count]) => ({
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getTodayAttendance(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.attendanceRepository.count({
      where: {
        clockIn: Between(today, tomorrow),
      },
    });
  }
}
