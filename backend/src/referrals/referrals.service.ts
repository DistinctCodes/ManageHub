import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async getMyCode(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const referralCode = (user as any).referralCode ?? null;
    const baseUrl = this.config.get<string>('APP_URL') || 'https://managehub.app';
    const shareableUrl = referralCode ? `${baseUrl}/register?ref=${referralCode}` : null;

    const totalReferrals = await this.userRepo.count({
      where: { referredById: userId } as any,
    });

    return { referralCode, shareableUrl, totalReferrals };
  }

  async getHistory(userId: string) {
    const referrals = await this.userRepo.find({
      where: { referredById: userId } as any,
      select: ['id', 'firstname', 'lastname', 'email', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return referrals;
  }
}
