import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCreditTransaction } from '../entities/credit-transaction.entity';
import { UserCredit } from '../entities/user-credit.entity';

export interface CreditHistoryQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class GetCreditHistoryProvider {
  constructor(
    @InjectRepository(UserCreditTransaction)
    private readonly transactionsRepository: Repository<UserCreditTransaction>,
    @InjectRepository(UserCredit)
    private readonly userCreditsRepository: Repository<UserCredit>,
  ) {}

  async find(
    userId: string,
    query: CreditHistoryQuery,
  ): Promise<{
    data: UserCreditTransaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const userCredit = await this.userCreditsRepository.findOne({
      where: { userId },
    });
    if (!userCredit) {
      return { data: [], total: 0, page, limit };
    }

    const [data, total] = await this.transactionsRepository.findAndCount({
      where: { userCreditId: userCredit.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
