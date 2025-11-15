import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Parser } from 'json2csv';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportType } from './enums/report-type.enum';
import { ReportFormat } from './enums/report-format.enum';

// --- Adjust paths to your actual entities ---
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async generateReport(dto: GenerateReportDto) {
    const { reportType, startDate, endDate, format } = dto;
    const dateRange = Between(new Date(startDate), new Date(endDate));

    let data: any[];
    let summary: any;

    switch (reportType) {
      case ReportType.BOOKINGS:
        [data, summary] = await this.generateBookingsReport(dateRange);
        break;
      case ReportType.PAYMENTS:
        [data, summary] = await this.generatePaymentsReport(dateRange);
        break;
      case ReportType.ATTENDANCE:
        [data, summary] = await this.generateAttendanceReport(dateRange);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    const reportPayload = {
      report: {
        type: reportType,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
      },
      summary,
      data,
    };

    if (format === ReportFormat.CSV) {
      if (data.length === 0) {
        return 'No data for this period.';
      }
      const parser = new Parser();
      return parser.parse(data);
    }
    
    // Default to JSON
    return reportPayload;
  }

  // --- Private Helper Methods for Aggregation ---

  private async generateBookingsReport(dateRange: any): Promise<[any[], any]> {
    // Note: Use 'createdAt' or a relevant date field from your Booking entity
    const bookings = await this.bookingRepository.find({
      where: { createdAt: dateRange },
    });
    
    const totalBookings = bookings.length;
    // You can add more complex aggregation here (e.g., by status)
    
    const summary = { totalBookings };
    return [bookings, summary];
  }

  private async generatePaymentsReport(dateRange: any): Promise<[any[], any]> {
    const qb = this.paymentRepository.createQueryBuilder('payment');
    qb.where('payment.createdAt BETWEEN :start AND :end', {
        start: dateRange.value[0],
        end: dateRange.value[1],
      })
      .andWhere('payment.status = :status', { status: 'completed' }); // Example filter

    const [totalRevenue, paymentCount] = await Promise.all([
      qb.select('SUM(payment.amount)', 'total').getRawOne(),
      qb.getCount(),
    ]);

    const summary = {
      totalRevenue: parseFloat(totalRevenue.total) || 0,
      totalTransactions: paymentCount,
    };
    
    const payments = await qb.getMany();
    return [payments, summary];
  }

  private async generateAttendanceReport(dateRange: any): Promise<[any[], any]> {
    // Note: Use 'checkInTime' or a relevant date field
    const qb = this.attendanceRepository.createQueryBuilder('attendance');
    qb.where('attendance.checkInTime BETWEEN :start AND :end', {
      start: dateRange.value[0],
      end: dateRange.value[1],
    });

    const [totalCheckIns, uniqueUsers] = await Promise.all([
      qb.getCount(),
      qb.select('COUNT(DISTINCT attendance.userId)', 'count').getRawOne(),
    ]);

    const summary = {
      totalCheckIns,
      uniqueUsers: parseInt(uniqueUsers.count, 10) || 0,
    };

    const data = await qb.getMany();
    return [data, summary];
  }
}