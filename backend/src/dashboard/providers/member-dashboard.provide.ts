import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

@Injectable()
export class MemberDashboardProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(WorkspaceLog)
    private readonly workspaceLogRepository: Repository<WorkspaceLog>,
  ) {}

  async getMemberStats(userId: string) {
    const [activeBookings, totalSpentResult, invoiceCount, lastLog] =
      await Promise.all([
        this.bookingRepository.count({
          where: {
            userId,
            status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
          },
        }),
        this.paymentRepository
          .createQueryBuilder('payment')
          .select('SUM(payment.amountKobo)', 'total')
          .where('payment.userId = :userId', { userId })
          .andWhere('payment.status = :status', {
            status: PaymentStatus.SUCCESS,
          })
          .getRawOne<{ total: string | null }>(),
        this.invoiceRepository.count({ where: { userId } }),
        this.workspaceLogRepository.findOne({
          where: { userId },
          order: { checkedInAt: 'DESC' },
        }),
      ]);

    return {
      activeBookings,
      totalSpentKobo: parseInt(totalSpentResult?.total ?? '0', 10) || 0,
      invoiceCount,
      lastCheckIn: lastLog?.checkedInAt ?? null,
    };
  }

  async getMemberDashboard(userId: string) {
    const [stats, recentBookings, recentPayments] = await Promise.all([
      this.getMemberStats(userId),
      this.bookingRepository.find({
        where: { userId },
        relations: ['workspace'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.paymentRepository.find({
        where: { userId, status: PaymentStatus.SUCCESS },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return { stats, recentBookings, recentPayments };
  }
}