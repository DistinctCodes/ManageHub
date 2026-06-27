import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ErrorCatch } from '../../utils/error';
import { MembershipStatus } from '../enums/membership-status.enum';

export interface PaginatedCommunityMembers {
  data: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    profilePicture: string;
    memberSince: Date;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetCommunityMembersProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getMembers(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedCommunityMembers> {
    try {
      const { page = 1, limit = 20, search } = query;

      const qb = this.usersRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.username',
          'user.firstname',
          'user.lastname',
          'user.profilePicture',
          'user.memberSince',
        ])
        .where('user.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere('user.isVerified = :isVerified', { isVerified: true })
        .andWhere('user.membershipStatus = :membershipStatus', {
          membershipStatus: MembershipStatus.ACTIVE,
        });

      if (search) {
        qb.andWhere(
          '(LOWER(user.username) LIKE :search OR LOWER(user.firstname) LIKE :search OR LOWER(user.lastname) LIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }

      const total = await qb.getCount();
      const data = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('user.memberSince', 'DESC')
        .getMany();

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      ErrorCatch(error, 'Error fetching community members');
    }
  }
}
