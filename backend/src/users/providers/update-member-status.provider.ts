import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { MembershipStatus } from '../enums/membership-status.enum';

@Injectable()
export class UpdateMemberStatusProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async updateStatus(memberId: string, status: MembershipStatus): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: memberId },
    });
    if (!user) {
      throw new NotFoundException(`Member with id "${memberId}" not found`);
    }

    user.membershipStatus = status;

    // Keep isSuspended in sync for backward compatibility
    user.isSuspended = status === MembershipStatus.SUSPENDED;
    user.isActive = status !== MembershipStatus.SUSPENDED;

    // Set memberSince when activating for the first time
    if (status === MembershipStatus.ACTIVE && !user.memberSince) {
      user.memberSince = new Date();
    }

    return this.usersRepository.save(user);
  }
}
