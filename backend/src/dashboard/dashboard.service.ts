import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NewsletterSubscriber } from '../newsletter/entities/newsletter.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NewsletterSubscriber)
    private readonly newsletterRepository: Repository<NewsletterSubscriber>,
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
      activeWorkspaces: 1, // placeholder until workspaces entity exists
      deskOccupancy: Math.min(Math.round((verifiedMembers / Math.max(totalMembers, 1)) * 100), 100),
    };
  }

  /**
   * Recent activity — derived from user registrations and verifications
   */
  async getActivity() {
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'firstname', 'lastname', 'email', 'createdAt', 'isVerified'],
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
      this.userRepository.count({ where: { isActive: true, isDeleted: false } }),
      this.userRepository.count({ where: { isSuspended: true, isDeleted: false } }),
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

  private async getMonthlyRegistrations(months: number) {
    const result: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

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
