import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, FindOptionsWhere } from 'typeorm';

class Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  membershipStatus: string;
  createdAt: Date;
}

interface SearchQuery {
  search?: string;
  role?: string;
  membershipStatus?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'name' | 'createdAt';
}

@Controller('sandbox/admin/members')
export class AdminMemberSearchController {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  /** GET /sandbox/admin/members — paginated, filtered member search (admin only) */
  @Get()
  async search(@Query() q: SearchQuery) {
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const where: FindOptionsWhere<Member>[] = q.search
      ? [
          { firstName: ILike(`%${q.search}%`) },
          { lastName: ILike(`%${q.search}%`) },
          { email: ILike(`%${q.search}%`) },
        ]
      : [{}];

    // Apply shared filters to every OR branch
    for (const branch of where) {
      if (q.role) branch.role = q.role;
      if (q.membershipStatus) branch.membershipStatus = q.membershipStatus;
      if (q.from && q.to) branch.createdAt = Between(new Date(q.from), new Date(q.to));
    }

    const [raw, total] = await this.memberRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: q.sort === 'name' ? { firstName: 'ASC' } : { createdAt: 'DESC' },
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'membershipStatus', 'createdAt'],
    });

    return { data: raw, total, page, limit };
  }
}
