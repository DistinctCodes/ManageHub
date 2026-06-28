import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCredit } from '../entities/user-credit.entity';

@Injectable()
export class GetCreditBalanceProvider {
  constructor(
    @InjectRepository(UserCredit)
    private readonly userCreditsRepository: Repository<UserCredit>,
  ) {}

  async getBalance(userId: string): Promise<{ remainingHours: number }> {
    const userCredit = await this.userCreditsRepository.findOne({
      where: { userId },
    });
    if (!userCredit) {
      return { remainingHours: 0 };
    }
    return { remainingHours: Number(userCredit.remainingHours) };
  }
}
