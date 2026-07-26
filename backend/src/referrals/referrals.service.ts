import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralCode } from './entities/referral-code.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(ReferralCode)
    private readonly codeRepository: Repository<ReferralCode>,
  ) {}

  async getMyCode(userId: string) {
    let code = await this.codeRepository.findOne({ where: { userId } });
    if (!code) {
      code = this.codeRepository.create({
        userId,
        code: this.generateCode(),
      });
      await this.codeRepository.save(code);
    }
    return {
      code: code.code,
      shareUrl: `/register?ref=${code.code}`,
    };
  }

  async registerWithReferral(referredUserId: string, referralCode: string) {
    const code = await this.codeRepository.findOne({ where: { code: referralCode } });
    if (!code) {
      throw new BadRequestException('Invalid referral code');
    }
    if (code.userId === referredUserId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    const existing = await this.referralRepository.findOne({
      where: { referredUserId },
    });
    if (existing) {
      throw new BadRequestException('Already referred');
    }

    const referral = this.referralRepository.create({
      referrerUserId: code.userId,
      referredUserId,
      codeUsed: referralCode,
      status: ReferralStatus.SIGNED_UP,
    });

    return this.referralRepository.save(referral);
  }

  async getMyReferrals(userId: string) {
    return this.referralRepository.find({
      where: { referrerUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
