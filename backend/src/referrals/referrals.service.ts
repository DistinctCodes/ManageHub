import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Referral, ReferralStatus, RewardType } from './entities/referral.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly config: ConfigService,
  ) {}

  private static readonly MAX_CODE_ATTEMPTS = 5;

  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.referralCode) return user.referralCode;
    for (let attempt = 0; attempt < ReferralsService.MAX_CODE_ATTEMPTS; attempt++) {
      const code = `MH-${randomBytes(4).toString('hex').toUpperCase()}`;
      try {
        await this.userRepo.update(userId, { referralCode: code });
        return code;
      } catch {
        // Unique-constraint collision — retry with a new code.
        if (attempt === ReferralsService.MAX_CODE_ATTEMPTS - 1) {
          throw new Error(
            `Failed to generate a unique referral code for user ${userId} after ${ReferralsService.MAX_CODE_ATTEMPTS} attempts`,
          );
        }
      }
    }
    // Unreachable, but TypeScript needs a definite return.
    throw new Error('ensureReferralCode exited unexpectedly');
  }

  async getMyCode(userId: string) {
    const code = await this.ensureReferralCode(userId);
    const baseUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('APP_URL') ||
      'https://managehub.vercel.app';
    return {
      referralCode: code,
      shareableUrl: `${baseUrl}/register?ref=${code}`,
    };
  }

  async getStats(userId: string) {
    const referrals = await this.referralRepo.find({
      where: { referrerId: userId },
    });
    const totalReferrals = referrals.length;
    const conversions = referrals.filter(
      (r) => r.status === ReferralStatus.COMPLETED,
    );
    const rewardsEarned = conversions.reduce(
      (sum, r) => sum + (r.rewardValue ?? 0),
      0,
    );
    return {
      totalReferrals,
      successfulConversions: conversions.length,
      totalRewardsEarned: rewardsEarned,
      referrals,
    };
  }

  async getAll() {
    return this.referralRepo.find({
      relations: ['referrer', 'referredUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async createReferral(
    referralCode: string,
    referredUserId: string,
  ): Promise<void> {
    const referrer = await this.userRepo.findOne({ where: { referralCode } });
    if (!referrer) return;
    // Idempotent: if this referred user already has a referral recorded, skip.
    const existing = await this.referralRepo.findOne({
      where: { referredUserId },
    });
    if (existing) return;
    await this.referralRepo.save(
      this.referralRepo.create({
        referrerId: referrer.id,
        referredUserId,
        code: referralCode,
        status: ReferralStatus.PENDING,
      }),
    );
  }

  /**
   * Mark the first pending referral for a user as completed (i.e. "conversion").
   * Called from the payments webhook once the referred user's first booking is paid.
   * Defaults the reward to a 10% discount if not previously set.
   */
  async completeReferral(referredUserId: string): Promise<void> {
    const referral = await this.referralRepo.findOne({
      where: { referredUserId, status: ReferralStatus.PENDING },
    });
    if (!referral) return;
    referral.status = ReferralStatus.COMPLETED;
    referral.awardedAt = new Date();
    referral.rewardType = referral.rewardType ?? RewardType.DISCOUNT;
    referral.rewardValue = referral.rewardValue ?? 10;
    await this.referralRepo.save(referral);
  }
}
