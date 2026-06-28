import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Referral } from './entities/referral.entity';
import { ReferralStatus } from './enums/referral-status.enum';
import { RewardType } from './enums/reward-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { ConfigService } from '@nestjs/config';

const REFERRAL_REWARD_TYPE = RewardType.DISCOUNT;
const REFERRAL_REWARD_VALUE = 10; // 10% discount

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,

    private readonly notificationsService: NotificationsService,

    private readonly configService: ConfigService,
  ) {}

  async getMyCode(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const referralCode = user?.referralCode ?? null;
    const baseUrl =
      this.configService.get<string>('APP_URL') || 'https://managehub.app';
    const shareableLink = referralCode
      ? `${baseUrl}/register?ref=${referralCode}`
      : null;

    return { referralCode, shareableLink };
  }

  async getStats(userId: string) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
    });

    const totalReferrals = referrals.length;
    const conversions = referrals.filter(
      (r) => r.status === ReferralStatus.COMPLETED,
    ).length;
    const rewardsEarned = referrals
      .filter((r) => r.status === ReferralStatus.COMPLETED && r.rewardValue)
      .reduce((sum, r) => sum + (r.rewardValue ?? 0), 0);

    return { totalReferrals, conversions, rewardsEarned };
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.referralRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['referrer', 'referredUser'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async completeReferral(referredUserId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { referredUserId, status: ReferralStatus.PENDING },
    });

    if (!referral) return;

    referral.status = ReferralStatus.COMPLETED;
    referral.rewardType = REFERRAL_REWARD_TYPE;
    referral.rewardValue = REFERRAL_REWARD_VALUE;
    referral.awardedAt = new Date();
    await this.referralRepository.save(referral);

    this.notificationsService
      .create({
        userId: referral.referrerId,
        type: NotificationType.GENERAL,
        title: 'Referral Reward Earned!',
        message: `Your referral just made their first payment. You've earned a ${REFERRAL_REWARD_VALUE}% discount reward.`,
        metadata: { referralId: referral.id, referredUserId },
      })
      .catch(() => void 0);

    this.logger.log(
      `Referral ${referral.id} completed — referrer ${referral.referrerId} awarded ${REFERRAL_REWARD_VALUE}% discount`,
    );
  }
}
