import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

class MemberReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  createdAt: Date;
  rewardPaid: boolean;
}

@Controller('sandbox/referrals')
export class ReferralController {
  constructor(
    @InjectRepository(MemberReferral)
    private readonly referralRepo: Repository<MemberReferral>,
  ) {}

  /** GET /sandbox/referrals/my-code — returns or generates the caller's referral code */
  @Get('my-code')
  async getMyCode(@Req() req: any): Promise<{ code: string }> {
    const userId: string = req.user.id;
    let record = await this.referralRepo.findOne({ where: { referrerId: userId, refereeId: null } });

    if (!record) {
      record = this.referralRepo.create({
        referrerId: userId,
        code: randomBytes(5).toString('hex'),
        rewardPaid: false,
        createdAt: new Date(),
      });
      await this.referralRepo.save(record);
    }

    return { code: record.code };
  }

  /** GET /sandbox/referrals/stats — referral count and rewards paid for the caller */
  @Get('stats')
  async getStats(@Req() req: any): Promise<{ referralCount: number; rewardsPaid: number }> {
    const userId: string = req.user.id;
    const records = await this.referralRepo.find({ where: { referrerId: userId } });
    return {
      referralCount: records.filter((r) => r.refereeId).length,
      rewardsPaid: records.filter((r) => r.rewardPaid).length,
    };
  }

  /** GET /sandbox/referrals — admin: all referral records with pagination */
  @Get()
  async listAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{ data: MemberReferral[]; total: number }> {
    const [data, total] = await this.referralRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }
}
