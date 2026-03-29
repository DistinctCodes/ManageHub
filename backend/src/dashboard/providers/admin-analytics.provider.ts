import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceLog } from '../../workspace-tracking/entities/workspace-log.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Invoice } from '../../payments/entities/invoice.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';

@Injectable()
export class AdminAnalyticsProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceLog)
    private readonly workspaceLogRepository: Repository<WorkspaceLog>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getOccupancySnapshot() {
    // Get total seats from all active workspaces
    const activeWorkspacesResult = await this.workspaceRepository
      .createQueryBuilder('workspace')
      .select('COUNT(workspace.id)', 'activeWorkspaces')
      .addSelect('SUM(workspace.totalSeats)', 'totalSeats')
      .where('workspace.isActive = :isActive', { isActive: true })
      .getRawOne();

    const activeWorkspaces = parseInt(activeWorkspacesResult.activeWorkspaces) || 0;
    const totalSeats = parseInt(activeWorkspacesResult.totalSeats) || 0;

    // Get occupied seats (check-ins without check-outs)
    const occupiedSeatsResult = await this.workspaceLogRepository
      .createQueryBuilder('log')
      .select('COUNT(log.id)', 'occupiedSeats')
      .where('log.checkedOutAt IS NULL')
      .getRawOne();

    const occupiedSeats = parseInt(occupiedSeatsResult.occupiedSeats) || 0;
    const availableSeats = totalSeats - occupiedSeats;
    const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return {
      totalSeats,
      occupiedSeats,
      availableSeats,
      occupancyPercent,
      activeWorkspaces,
    };
  }

  async getRevenueStats(from?: string, to?: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Base query for successful payments
    const baseQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'SUCCESSFUL' });

    // Apply date range filters if provided
    if (from) {
      baseQuery.andWhere('payment.createdAt >= :from', { from });
    }
    if (to) {
      baseQuery.andWhere('payment.createdAt <= :to', { to });
    }

    // Get total revenue (with date range filters)
    const totalQuery = baseQuery.clone();
    const totalResult = await totalQuery
      .select('SUM(payment.amountKobo)', 'total')
      .getRawOne();
    const total = parseInt(totalResult.total) || 0;

    // Get this month revenue (without date range filters for month calculation)
    const thisMonthQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'SUCCESSFUL' })
      .andWhere('payment.createdAt >= :thisMonthStart', { thisMonthStart: currentMonthStart });
    
    if (from && new Date(from) > currentMonthStart) {
      thisMonthQuery.andWhere('payment.createdAt >= :from', { from });
    }
    if (to) {
      thisMonthQuery.andWhere('payment.createdAt <= :to', { to });
    }

    const thisMonthResult = await thisMonthQuery
      .select('SUM(payment.amountKobo)', 'thisMonth')
      .getRawOne();
    const thisMonthRevenue = parseInt(thisMonthResult.thisMonth) || 0;

    // Get last month revenue (without date range filters for month calculation)
    const lastMonthQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'SUCCESSFUL' })
      .andWhere('payment.createdAt >= :lastMonthStart', { lastMonthStart })
      .andWhere('payment.createdAt <= :lastMonthEnd', { lastMonthEnd });

    const lastMonthResult = await lastMonthQuery
      .select('SUM(payment.amountKobo)', 'lastMonth')
      .getRawOne();
    const lastMonthRevenue = parseInt(lastMonthResult.lastMonth) || 0;

    // Get 6-month trend
    const trendQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .select("DATE_TRUNC('month', payment.createdAt)", 'month')
      .addSelect('SUM(payment.amountKobo)', 'totalKobo')
      .where('payment.status = :status', { status: 'SUCCESSFUL' })
      .andWhere('payment.createdAt >= NOW() - INTERVAL \'6 months\'')
      .groupBy("DATE_TRUNC('month', payment.createdAt)")
      .orderBy("DATE_TRUNC('month', payment.createdAt)", 'ASC');

    // Apply date range filters to trend if provided
    if (from) {
      trendQuery.andWhere('payment.createdAt >= :from', { from });
    }
    if (to) {
      trendQuery.andWhere('payment.createdAt <= :to', { to });
    }

    const trendResults = await trendQuery.getRawMany();
    const trend = trendResults.map(result => ({
      month: result.month,
      totalKobo: parseInt(result.totalKobo) || 0,
      totalNaira: Math.round((parseInt(result.totalKobo) || 0) / 100),
    }));

    return {
      total,
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      trend,
    };
  }

  async getBookingStats(from?: string, to?: string) {
    // Get booking counts by status
    const statusQuery = this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.status', 'status')
      .addSelect('COUNT(booking.id)', 'count')
      .groupBy('booking.status');

    if (from) {
      statusQuery.andWhere('booking.createdAt >= :from', { from });
    }
    if (to) {
      statusQuery.andWhere('booking.createdAt <= :to', { to });
    }

    const statusResults = await statusQuery.getRawMany();
    const byStatus = statusResults.reduce((acc, result) => {
      acc[result.status] = parseInt(result.count);
      return acc;
    }, {} as Record<string, number>);

    // Get monthly trend for last 6 months
    const trendQuery = this.bookingRepository
      .createQueryBuilder('booking')
      .select("DATE_TRUNC('month', booking.createdAt)", 'month')
      .addSelect('COUNT(booking.id)', 'count')
      .where('booking.createdAt >= NOW() - INTERVAL \'6 months\'')
      .groupBy("DATE_TRUNC('month', booking.createdAt)")
      .orderBy("DATE_TRUNC('month', booking.createdAt)", 'ASC');

    if (from) {
      trendQuery.andWhere('booking.createdAt >= :from', { from });
    }
    if (to) {
      trendQuery.andWhere('booking.createdAt <= :to', { to });
    }

    const trendResults = await trendQuery.getRawMany();
    const trend = trendResults.map(result => ({
      month: result.month,
      count: parseInt(result.count),
    }));

    return {
      byStatus,
      trend,
    };
  }

  async getTopWorkspaces(limit = 5, from?: string, to?: string) {
    const query = this.workspaceRepository
      .createQueryBuilder('workspace')
      .leftJoin('booking', 'booking', 'booking.workspaceId = workspace.id')
      .leftJoin('payment', 'payment', 'payment.bookingId = booking.id AND payment.status = :paymentStatus', { paymentStatus: 'SUCCESSFUL' })
      .select('workspace.id', 'id')
      .addSelect('workspace.name', 'name')
      .addSelect('COUNT(DISTINCT booking.id)', 'bookings')
      .addSelect('COALESCE(SUM(payment.amountKobo), 0)', 'revenueKobo')
      .where('workspace.isActive = :isActive', { isActive: true })
      .groupBy('workspace.id, workspace.name')
      .orderBy('COUNT(DISTINCT booking.id)', 'DESC')
      .limit(limit);

    if (from) {
      query.andWhere('booking.createdAt >= :from', { from });
    }
    if (to) {
      query.andWhere('booking.createdAt <= :to', { to });
    }

    const results = await query.getRawMany();
    return results.map(result => ({
      id: result.id,
      name: result.name,
      bookings: parseInt(result.bookings) || 0,
      revenueKobo: parseInt(result.revenueKobo) || 0,
    }));
  }

  async getTopMembers(limit = 5, from?: string, to?: string) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('user', 'user', 'user.id = payment.userId')
      .select('user.id', 'id')
      .addSelect("user.firstname || ' ' || user.lastname", 'fullName')
      .addSelect('SUM(payment.amountKobo)', 'totalKobo')
      .where('payment.status = :status', { status: 'SUCCESSFUL' })
      .groupBy('user.id, user.firstname, user.lastname')
      .orderBy('SUM(payment.amountKobo)', 'DESC')
      .limit(limit);

    if (from) {
      query.andWhere('payment.createdAt >= :from', { from });
    }
    if (to) {
      query.andWhere('payment.createdAt <= :to', { to });
    }

    const results = await query.getRawMany();
    return results.map(result => ({
      id: result.id,
      fullName: result.fullName || 'Unknown User',
      totalKobo: parseInt(result.totalKobo) || 0,
    }));
  }

  async getInvoiceStats(from?: string, to?: string) {
    const baseQuery = this.invoiceRepository.createQueryBuilder('invoice');

    // Apply date range filters if provided
    if (from) {
      baseQuery.andWhere('invoice.createdAt >= :from', { from });
    }
    if (to) {
      baseQuery.andWhere('invoice.createdAt <= :to', { to });
    }

    // Get total count
    const totalQuery = baseQuery.clone();
    const totalResult = await totalQuery
      .select('COUNT(invoice.id)', 'total')
      .getRawOne();
    const total = parseInt(totalResult.total) || 0;

    // Get paid count
    const paidQuery = baseQuery.clone();
    const paidResult = await paidQuery
      .select('COUNT(invoice.id)', 'paid')
      .where('invoice.status = :status', { status: 'PAID' })
      .getRawOne();
    const paid = parseInt(paidResult.paid) || 0;

    // Get pending count
    const pendingQuery = baseQuery.clone();
    const pendingResult = await pendingQuery
      .select('COUNT(invoice.id)', 'pending')
      .where('invoice.status = :status', { status: 'PENDING' })
      .getRawOne();
    const pending = parseInt(pendingResult.pending) || 0;

    // Get total amount
    const amountQuery = baseQuery.clone();
    const amountResult = await amountQuery
      .select('SUM(invoice.amountKobo)', 'totalAmountKobo')
      .getRawOne();
    const totalAmountKobo = parseInt(amountResult.totalAmountKobo) || 0;
    const totalAmountNaira = Math.round(totalAmountKobo / 100);

    return {
      total,
      paid,
      pending,
      totalAmountKobo,
      totalAmountNaira,
    };
  }

  async getFullAdminDashboard(from?: string, to?: string) {
    const [
      revenue,
      bookings,
      topWorkspaces,
      topMembers,
      invoices,
      occupancy,
    ] = await Promise.all([
      this.getRevenueStats(from, to),
      this.getBookingStats(from, to),
      this.getTopWorkspaces(5, from, to),
      this.getTopMembers(5, from, to),
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
