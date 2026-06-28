import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ErrorCatch } from '../../utils/error';
import { MembershipStatus } from '../enums/membership-status.enum';
import { computeProfileCompleteness } from '../utils/profile-completeness.util';

@Injectable()
export class GetPublicProfileProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getPublicProfile(
    username: string,
  ): Promise<{
    username: string;
    firstname: string;
    lastname: string;
    profilePicture: string;
    memberSince: Date;
    profileCompleteness: number;
  }> {
    try {
      const user = await this.usersRepository.findOne({
        where: { username },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (
        user.isSuspended ||
        !user.isActive ||
        user.membershipStatus === MembershipStatus.SUSPENDED
      ) {
        throw new ForbiddenException('User is suspended or inactive');
      }

      const completeness = computeProfileCompleteness(user);
      if (user.profileCompleteness !== completeness) {
        await this.usersRepository.update(user.id, {
          profileCompleteness: completeness,
        });
        user.profileCompleteness = completeness;
      }

      return {
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        profilePicture: user.profilePicture,
        memberSince: user.memberSince,
        profileCompleteness: user.profileCompleteness,
      };
    } catch (error) {
      ErrorCatch(error, 'Error fetching public profile');
    }
  }
}
