import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { WorkspaceLog } from '../../workspace-tracking/entities/workspace-log.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { InvoiceStatus } from '../../invoices/enums/invoice-status.enum';

@Injectable()
export class AdminAnalyticsProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(WorkspaceLog)
    private readonly workspaceLogsRepository: Repository<WorkspaceLog>,
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
    private readonly dataSource: DataSource,
  ) {}

  async getRevenueStats(from?: string, to?: string) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const qb = this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS });

    if (from) qb.andWhere('p.paidAt >= :from', { from });
    if (to) qb.andWhere('p.paidAt <= :to', { to });

    const totalResult = await qb
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const thisMonthResult = await this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('p.paidAt >= :start', { start: thisMonthStart })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const lastMonthResult = await this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('p.paidAt >= :start', { start: lastMonthStart })
      .andWhere('p.paidAt <= :end', { end: lastMonthEnd })
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    // 6-month trend
    const trend = await this.dataSource.query<
      { month: string; total: string }[]
    >(`
      SELECT DATE_TRUNC('month', "paidAt") AS month, COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE status = 'SUCCESS' AND "paidAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    return {
      total: Number(totalResult?.total ?? 0),
      thisMonth: Number(thisMonthResult?.total ?? 0),
      lastMonth: Number(lastMonthResult?.total ?? 0),
      trend: trend.map((r) => ({
        month: new Date(r.month).toLocaleString('en', {
          month: 'short',
          year: 'numeric',
        }),
        totalKobo: Number(r.total),
        totalNaira: Number(r.total) / 100,
      })),
    };
  }

  async getBookingStats(from?: string, to?: string) {
    const qb = this.bookingsRepository.createQueryBuilder('b');
    if (from) qb.where('b.createdAt >= :from', { from });
    if (to) qb.andWhere('b.createdAt <= :to', { to });

    const statusCounts = await qb
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.status')
      .getRawMany<{ status: string; count: string }>();

    const trend = await this.dataSource.query<
      { month: string; count: string }[]
    >(`
      SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*) AS count
      FROM bookings
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    return {
      byStatus: statusCounts.reduce(
        (acc, r) => ({ ...acc, [r.status]: Number(r.count) }),
        {} as Record<string, number>,
      ),
      trend: trend.map((r) => ({
        month: new Date(r.month).toLocaleString('en', {
          month: 'short',
          year: 'numeric',
        }),
        count: Number(r.count),
      })),
    };
  }

  async getTopWorkspaces(limit = 5) {
    return this.dataSource.query<
      { id: string; name: string; bookings: string; revenueKobo: string }[]
    >(
      `
      SELECT w.id, w.name,
             COUNT(b.id) AS bookings,
             COALESCE(SUM(p.amount), 0) AS "revenueKobo"
      FROM workspaces w
      LEFT JOIN bookings b ON b."workspaceId" = w.id
      LEFT JOIN payments p ON p."bookingId" = b.id AND p.status = 'SUCCESS'
      GROUP BY w.id, w.name
      ORDER BY bookings DESC
      LIMIT $1
    `,
      [limit],
    );
  }

  async getTopMembers(limit = 5) {
    return this.dataSource.query<
      { id: string; fullName: string; totalKobo: string }[]
    >(
      `
      SELECT u.id,
             CONCAT(u.firstname, ' ', u.lastname) AS "fullName",
             COALESCE(SUM(p.amount), 0) AS "totalKobo"
      FROM users u
      LEFT JOIN payments p ON p."userId" = u.id AND p.status = 'SUCCESS'
      GROUP BY u.id, u.firstname, u.lastname
      ORDER BY "totalKobo" DESC
      LIMIT $1
    `,
      [limit],
    );
  }

  async getInvoiceStats(from?: string, to?: string) {
    const qb = this.invoicesRepository.createQueryBuilder('i');
    if (from) qb.where('i.createdAt >= :from', { from });
    if (to) qb.andWhere('i.createdAt <= :to', { to });

    const [total, totalAmount, paid, pending] = await Promise.all([
      qb.clone().getCount(),
      qb
        .clone()
        .select('COALESCE(SUM(i.amountKobo), 0)', 'total')
        .getRawOne<{ total: string }>(),
      qb
        .clone()
        .andWhere('i.status = :s', { s: InvoiceStatus.PAID })
        .getCount(),
      qb
        .clone()
        .andWhere('i.status = :s', { s: InvoiceStatus.PENDING })
        .getCount(),
    ]);

    return {
      total,
      totalAmountKobo: Number(totalAmount?.total ?? 0),
      totalAmountNaira: Number(totalAmount?.total ?? 0) / 100,
      paid,
      pending,
    };
  }

  async getOccupancySnapshot() {
    const [totalSeats, activeCheckIns, totalWorkspaces] = await Promise.all([
      this.workspacesRepository
        .createQueryBuilder('w')
        .where('w.isActive = true')
        .select('COALESCE(SUM(w.totalSeats), 0)', 'total')
        .getRawOne<{ total: string }>(),
      this.workspaceLogsRepository
        .createQueryBuilder('l')
        .where('l.checkedOutAt IS NULL')
        .getCount(),
      this.workspacesRepository.count({ where: { isActive: true } }),
    ]);

    const total = Number(totalSeats?.total ?? 0);
    return {
      totalSeats: total,
      occupiedSeats: activeCheckIns,
      availableSeats: Math.max(0, total - activeCheckIns),
      occupancyPercent:
        total > 0 ? Math.round((activeCheckIns / total) * 100) : 0,
      activeWorkspaces: totalWorkspaces,
    };
  }

  async getFullAdminDashboard(from?: string, to?: string) {
    const [revenue, bookings, topWorkspaces, topMembers, invoices, occupancy] =
      await Promise.all([
        this.getRevenueStats(from, to),
        this.getBookingStats(from, to),
        this.getTopWorkspaces(),
        this.getTopMembers(),
        this.getInvoiceStats(from, to),
        this.getOccupancySnapshot(),
      ]);

    return {
      revenue,
      bookings,
      topWorkspaces,
      topMembers,
      invoices,
      occupancy,
    };
  }
}
