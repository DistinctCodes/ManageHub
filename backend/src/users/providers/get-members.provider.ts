import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { MemberQueryDto } from '../dto/member-query.dto';

export interface PaginatedMembers {
  data: Partial<User>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetMembersProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getMembers(query: MemberQueryDto): Promise<PaginatedMembers> {
    const { page = 1, limit = 20, status, search } = query;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'user.phone',
        'user.username',
        'user.profilePicture',
        'user.role',
        'user.membershipStatus',
        'user.memberSince',
        'user.profileCompleteness',
        'user.isVerified',
        'user.isActive',
        'user.isSuspended',
        'user.createdAt',
      ])
      .where('user.isDeleted = :isDeleted', { isDeleted: false });

    if (status) {
      qb.andWhere('user.membershipStatus = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.firstname) LIKE :search OR LOWER(user.lastname) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
