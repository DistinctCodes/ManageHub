import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { MembershipStatus } from '../enums/membership-status.enum';

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  verified: number;
}

@Injectable()
export class GetMemberStatsProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getStats(): Promise<MemberStats> {
    const [total, active, inactive, suspended, verified] = await Promise.all([
      this.usersRepository.count({ where: { isDeleted: false } }),
      this.usersRepository.count({
        where: { membershipStatus: MembershipStatus.ACTIVE, isDeleted: false },
      }),
      this.usersRepository.count({
        where: {
          membershipStatus: MembershipStatus.INACTIVE,
          isDeleted: false,
        },
      }),
      this.usersRepository.count({
        where: {
          membershipStatus: MembershipStatus.SUSPENDED,
          isDeleted: false,
        },
      }),
      this.usersRepository.count({
        where: { isVerified: true, isDeleted: false },
      }),
    ]);

    return { total, active, inactive, suspended, verified };
  }
}
