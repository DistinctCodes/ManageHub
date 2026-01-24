import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  MemberMetrics,
  MemberGrowthTrend,
  MemberRoleDistribution,
  CohortData,
  ChurnPrediction,
  AggregationPeriod,
} from '../types/analytics.types';

@Injectable()
export class MemberAnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getMemberMetrics(
    startDate: Date,
    endDate: Date,
    aggregation: AggregationPeriod = 'daily',
  ): Promise<MemberMetrics> {
    // Get total and active members
    const totalMembers = await this.userRepository.count({
      where: { isDeleted: false },
    });

    const activeMembers = await this.userRepository.count({
      where: { isActive: true, isDeleted: false },
    });

    const inactiveMembers = totalMembers - activeMembers;

    // Get new members in the period
    const newMembers = await this.userRepository.count({
      where: {
        createdAt: Between(startDate, endDate),
        isDeleted: false,
      },
    });

    // Get churned members (deleted or deactivated in period)
    const churnedMembers = await this.userRepository.count({
      where: [
        {
          deletedAt: Between(startDate, endDate),
        },
        {
          isActive: false,
          updatedAt: Between(startDate, endDate),
        },
      ],
    });

    // Calculate retention and churn rates
    const previousPeriodMembers = await this.getMemberCountAtDate(startDate);
    const retentionRate =
      previousPeriodMembers > 0
        ? ((previousPeriodMembers - churnedMembers) / previousPeriodMembers) *
          100
        : 100;
    const churnRate = 100 - retentionRate;

    // Calculate average member age (in days)
    const averageMemberAge = await this.calculateAverageMemberAge();

    // Get growth trends
    const memberGrowth = await this.getMemberGrowthTrends(
      startDate,
      endDate,
      aggregation,
    );

    // Get members by role
    const membersByRole = await this.getMembersByRole();

    // Get cohort analysis
    const cohortAnalysis = await this.getCohortAnalysis();

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      newMembers,
      churnedMembers,
      retentionRate: Math.round(retentionRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      averageMemberAge: Math.round(averageMemberAge),
      memberGrowth,
      membersByRole,
      cohortAnalysis,
    };
  }

  private async getMemberCountAtDate(date: Date): Promise<number> {
    return this.userRepository.count({
      where: {
        createdAt: LessThan(date),
        isDeleted: false,
      },
    });
  }

  private async calculateAverageMemberAge(): Promise<number> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(EXTRACT(DAY FROM NOW() - user.createdAt))', 'avgAge')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    return parseFloat(result?.avgAge) || 0;
  }

  private async getMemberGrowthTrends(
    startDate: Date,
    endDate: Date,
    aggregation: AggregationPeriod,
  ): Promise<MemberGrowthTrend[]> {
    const dateFormat = this.getDateFormatForAggregation(aggregation);

    // Get new members by period
    const newMembersQuery = await this.userRepository
      .createQueryBuilder('user')
      .select(`TO_CHAR(user.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'newMembers')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy(`TO_CHAR(user.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get churned members by period
    const churnedMembersQuery = await this.userRepository
      .createQueryBuilder('user')
      .select(`TO_CHAR(user.deletedAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'churnedMembers')
      .where('user.deletedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(`TO_CHAR(user.deletedAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Merge the data
    const churnedByDate = new Map(
      churnedMembersQuery.map((r) => [r.date, parseInt(r.churnedMembers, 10)]),
    );

    let runningTotal = await this.getMemberCountAtDate(startDate);

    return newMembersQuery.map((row) => {
      const newCount = parseInt(row.newMembers, 10);
      const churnedCount = churnedByDate.get(row.date) || 0;
      runningTotal += newCount - churnedCount;

      return {
        date: row.date,
        totalMembers: runningTotal,
        newMembers: newCount,
        churnedMembers: churnedCount,
        netGrowth: newCount - churnedCount,
      };
    });
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

  private async getMembersByRole(): Promise<MemberRoleDistribution[]> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('user.role')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return result.map((row) => ({
      role: row.role,
      count: parseInt(row.count, 10),
      percentage:
        Math.round((parseInt(row.count, 10) / (total || 1)) * 100 * 100) / 100,
    }));
  }

  private async getCohortAnalysis(): Promise<CohortData[]> {
    // Get cohorts by month of signup
    const cohorts = await this.userRepository
      .createQueryBuilder('user')
      .select("TO_CHAR(user.createdAt, 'YYYY-MM')", 'cohortMonth')
      .addSelect('COUNT(*)', 'totalMembers')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy("TO_CHAR(user.createdAt, 'YYYY-MM')")
      .orderBy('cohortMonth', 'DESC')
      .limit(12) // Last 12 months
      .getRawMany();

    // For each cohort, calculate retention by month
    const cohortData: CohortData[] = [];

    for (const cohort of cohorts) {
      const cohortMonth = cohort.cohortMonth;
      const totalMembers = parseInt(cohort.totalMembers, 10);

      // Calculate retention for each subsequent month
      const retentionByMonth: number[] = [];
      const cohortStartDate = new Date(`${cohortMonth}-01`);

      for (let month = 0; month <= 6; month++) {
        const checkDate = new Date(cohortStartDate);
        checkDate.setMonth(checkDate.getMonth() + month);

        const retainedCount = await this.userRepository.count({
          where: {
            createdAt: Between(
              cohortStartDate,
              new Date(
                cohortStartDate.getFullYear(),
                cohortStartDate.getMonth() + 1,
                0,
              ),
            ),
            isActive: true,
            isDeleted: false,
          },
        });

        const retentionRate =
          totalMembers > 0 ? (retainedCount / totalMembers) * 100 : 0;
        retentionByMonth.push(Math.round(retentionRate * 100) / 100);
      }

      cohortData.push({
        cohortMonth,
        totalMembers,
        retentionByMonth,
      });
    }

    return cohortData;
  }

  async getChurnPredictions(): Promise<ChurnPrediction[]> {
    // Find users who might be at risk of churning
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const atRiskUsers = await this.userRepository.find({
      where: {
        isActive: true,
        isDeleted: false,
        updatedAt: LessThan(thirtyDaysAgo),
      },
      take: 50,
    });

    return atRiskUsers.map((user) => {
      const daysSinceActivity = Math.floor(
        (Date.now() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      let churnProbability: number;
      let riskLevel: 'low' | 'medium' | 'high';

      if (daysSinceActivity > 60) {
        churnProbability = 0.8;
        riskLevel = 'high';
      } else if (daysSinceActivity > 45) {
        churnProbability = 0.5;
        riskLevel = 'medium';
      } else {
        churnProbability = 0.2;
        riskLevel = 'low';
      }

      return {
        userId: user.id,
        userName: `${user.firstname} ${user.lastname}`,
        churnProbability,
        riskLevel,
        lastActivity: user.updatedAt,
        factors: [
          `No activity for ${daysSinceActivity} days`,
          daysSinceActivity > 45 ? 'Extended inactivity' : '',
        ].filter(Boolean),
      };
    });
  }

  async getTotalMembers(): Promise<number> {
    return this.userRepository.count({
      where: { isDeleted: false },
    });
  }

  async getActiveMembers(): Promise<number> {
    return this.userRepository.count({
      where: { isActive: true, isDeleted: false },
    });
  }

  async getNewMembersThisMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.userRepository.count({
      where: {
        createdAt: MoreThan(startOfMonth),
        isDeleted: false,
      },
    });
  }

  async getMemberGrowthPercentage(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthNew = await this.userRepository.count({
      where: {
        createdAt: Between(startOfMonth, now),
        isDeleted: false,
      },
    });

    const lastMonthNew = await this.userRepository.count({
      where: {
        createdAt: Between(startOfLastMonth, startOfMonth),
        isDeleted: false,
      },
    });

    if (lastMonthNew === 0) return currentMonthNew > 0 ? 100 : 0;

    return (
      Math.round(
        ((currentMonthNew - lastMonthNew) / lastMonthNew) * 100 * 100,
      ) / 100
    );
  }
}
