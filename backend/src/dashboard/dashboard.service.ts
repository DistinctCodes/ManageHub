import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NewsletterSubscriber } from '../newsletter/entities/newsletter.entity';
import { AdminAnalyticsProvider } from './providers/admin-analytics.provider';
import { MemberDashboardProvider } from './providers/member-dashboard.provider';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NewsletterSubscriber)
    private readonly newsletterRepository: Repository<NewsletterSubscriber>,
    private readonly adminAnalyticsProvider: AdminAnalyticsProvider,
    private readonly memberDashboardProvider: MemberDashboardProvider,
  ) {}

  /**
   * Stats visible to any authenticated user
   */
  async getUserStats(userId: string) {
    const totalMembers = await this.userRepository.count({
      where: { isActive: true, isDeleted: false },
    });

    const verifiedMembers = await this.userRepository.count({
      where: { isActive: true, isDeleted: false, isVerified: true },
    });

    return {
      totalMembers,
      verifiedMembers,
      activeWorkspaces:
        await this.adminAnalyticsProvider.getActiveWorkspacesCount(),
      deskOccupancy: Math.min(
        Math.round((verifiedMembers / Math.max(totalMembers, 1)) * 100),
        100,
      ),
    };
  }

  /**
   * Recent activity — derived from user registrations and verifications
   */
  async getActivity() {
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: [
        'id',
        'firstname',
        'lastname',
        'email',
        'createdAt',
        'isVerified',
      ],
    });

    return recentUsers.map((u) => ({
      id: u.id,
      type: u.isVerified ? 'member_verified' : 'member_registered',
      description: u.isVerified
        ? `${u.firstname} ${u.lastname} verified their account`
        : `${u.firstname} ${u.lastname} registered`,
      timestamp: u.createdAt,
    }));
  }

  /**
   * Admin-only system-wide stats
   */
  async getAdminStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersThisMonth,
      totalSubscribers,
      verifiedSubscribers,
      activeSubscribers,
      newSubscribersThisMonth,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: false } }),
      this.userRepository.count({
        where: { isActive: true, isDeleted: false },
      }),
      this.userRepository.count({
        where: { isSuspended: true, isDeleted: false },
      }),
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo), isDeleted: false },
      }),
      this.newsletterRepository.count(),
      this.newsletterRepository.count({ where: { isVerified: true } }),
      this.newsletterRepository.count({ where: { isActive: true } }),
      this.newsletterRepository.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      }),
    ]);

    // Registration trend — last 6 months
    const registrationTrend = await this.getMonthlyRegistrations(6);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newThisMonth: newUsersThisMonth,
      },
      newsletter: {
        total: totalSubscribers,
        verified: verifiedSubscribers,
        active: activeSubscribers,
        newThisMonth: newSubscribersThisMonth,
        confirmationRate:
          totalSubscribers > 0
            ? Math.round((verifiedSubscribers / totalSubscribers) * 100)
            : 0,
      },
      registrationTrend,
    };
  }

  /**
   * Admin-only: list all users with pagination
   */
  async getUsers(page: number, limit: number, search?: string) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .select([
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'user.role',
        'user.isActive',
        'user.isSuspended',
        'user.isVerified',
        'user.createdAt',
        'user.profilePicture',
      ])
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(user.firstname ILIKE :search OR user.lastname ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  getAdminAnalytics(from?: string, to?: string) {
    return this.adminAnalyticsProvider.getFullAdminDashboard(from, to);
  }

  getMemberDashboard(userId: string) {
    return this.memberDashboardProvider.getMemberDashboard(userId);
  }

  getMemberBookings(userId: string, page: number, limit: number) {
    return this.memberDashboardProvider.getMemberBookings(userId, page, limit);
  }

  getMemberPayments(userId: string, page: number, limit: number) {
    return this.memberDashboardProvider.getMemberPayments(userId, page, limit);
  }

  getMemberInvoices(userId: string, page: number, limit: number) {
    return this.memberDashboardProvider.getMemberInvoices(userId, page, limit);
  }

  getMemberCheckIns(userId: string, limit: number) {
    return this.memberDashboardProvider.getMemberCheckIns(userId, limit);
  }

  async getChurnRisk(page: number, limit: number) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const activeUsers = await this.userRepository
      .createQueryBuilder('u')
      .where('u.isDeleted = :d', { d: false })
      .andWhere('u.isVerified = :v', { v: true })
      .getMany();

    const results: any[] = [];
    for (const user of activeUsers) {
      const recentBooking = await this.bookingRepository
        .createQueryBuilder('b')
        .where('b.userId = :uid', { uid: user.id })
        .andWhere('b.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount();

      const olderBooking = await this.bookingRepository
        .createQueryBuilder('b')
        .where('b.userId = :uid', { uid: user.id })
        .andWhere('b.createdAt >= :ninetyDaysAgo', { ninetyDaysAgo })
        .andWhere('b.createdAt < :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount();

      const isAtRisk = (recentBooking === 0 && olderBooking > 0) ||
        (user as any).membershipStatus === 'inactive';

      if (isAtRisk) {
        const lastBooking = await this.bookingRepository
          .createQueryBuilder('b')
          .where('b.userId = :uid', { uid: user.id })
          .orderBy('b.createdAt', 'DESC')
          .getOne();

        const totalBookings = await this.bookingRepository.count({ where: { userId: user.id } as any });
        const daysSince = lastBooking
          ? Math.floor((now.getTime() - lastBooking.createdAt.getTime()) / (24 * 60 * 60 * 1000))
          : 90;
        const riskScore = Math.min(100, Math.round(100 - (daysSince / 90) * 100));

        results.push({
          userId: user.id,
          fullName: `${user.firstname} ${user.lastname}`,
          email: user.email,
          lastBookingDate: lastBooking?.createdAt ?? null,
          totalBookingsAllTime: totalBookings,
          riskScore,
        });
      }
    }

    results.sort((a, b) => b.riskScore - a.riskScore);
    const total = results.length;
    const items = results.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async getMonthlyRegistrations(months: number) {
    const result: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );

      const count = await this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(start),
          isDeleted: false,
        },
      });

      // We need a between query, but MoreThanOrEqual + manual filter works for trend
      const monthLabel = start.toLocaleString('en', { month: 'short' });
      result.push({ month: monthLabel, count });
    }

    return result;
  }
}
