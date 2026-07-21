import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { WorkspaceLog } from '../../workspace-tracking/entities/workspace-log.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';

@Injectable()
export class MemberDashboardProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(WorkspaceLog)
    private readonly workspaceLogsRepository: Repository<WorkspaceLog>,
  ) {}

  async getMemberStats(userId: string) {
    const [activeBookings, totalSpentResult, invoiceCount, lastCheckIn] =
      await Promise.all([
        this.bookingsRepository.count({
          where: [
            { userId, status: BookingStatus.CONFIRMED },
            { userId, status: BookingStatus.PENDING },
          ],
        }),
        this.paymentsRepository
          .createQueryBuilder('p')
          .where('p.userId = :userId', { userId })
          .andWhere('p.status = :status', { status: PaymentStatus.SUCCESS })
          .select('COALESCE(SUM(p.amount), 0)', 'total')
          .getRawOne<{ total: string }>(),
        this.invoicesRepository.count({ where: { userId } }),
        this.workspaceLogsRepository.findOne({
          where: { userId },
          order: { checkedInAt: 'DESC' },
          select: ['checkedInAt'],
        }),
      ]);

    return {
      activeBookings,
      totalSpentKobo: Number(totalSpentResult?.total ?? 0),
      totalSpentNaira: Number(totalSpentResult?.total ?? 0) / 100,
      invoiceCount,
      lastCheckIn: lastCheckIn?.checkedInAt ?? null,
    };
  }

  async getMemberBookings(userId: string, page: number, limit: number) {
    const [data, total] = await this.bookingsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMemberPayments(userId: string, page: number, limit: number) {
    const [data, total] = await this.paymentsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMemberInvoices(userId: string, page: number, limit: number) {
    const [data, total] = await this.invoicesRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMemberCheckIns(userId: string, limit: number) {
    return this.workspaceLogsRepository.find({
      where: { userId },
      order: { checkedInAt: 'DESC' },
      take: limit,
    });
  }

  async getMemberDashboard(userId: string) {
    const [stats, recentBookings, recentPayments] = await Promise.all([
      this.getMemberStats(userId),
      this.getMemberBookings(userId, 1, 5),
      this.getMemberPayments(userId, 1, 5),
    ]);
    return {
      stats,
      recentBookings: recentBookings.data,
      recentPayments: recentPayments.data,
    };
  }
}
