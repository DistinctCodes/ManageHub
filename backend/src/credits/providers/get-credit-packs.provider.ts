import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditPack } from '../entities/credit-pack.entity';

@Injectable()
export class GetCreditPacksProvider {
  constructor(
    @InjectRepository(CreditPack)
    private readonly creditPacksRepository: Repository<CreditPack>,
  ) {}

  async findAllActive(): Promise<CreditPack[]> {
    return this.creditPacksRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }
}
