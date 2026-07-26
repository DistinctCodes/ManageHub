import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NpsResponse } from './entities/nps-response.entity';

@Injectable()
export class NpsService {
  constructor(
    @InjectRepository(NpsResponse)
    private readonly npsRepository: Repository<NpsResponse>,
  ) {}

  async submitResponse(userId: string, score: number, comment?: string) {
    const period = this.getCurrentPeriod();
    
    const existing = await this.npsRepository.findOne({
      where: { userId, surveyPeriod: period },
    });

    if (existing) {
      throw new ConflictException('Already submitted for this period');
    }

    const response = this.npsRepository.create({
      userId,
      score,
      comment,
      surveyPeriod: period,
    });

    return this.npsRepository.save(response);
  }

  async getSummary(period: string) {
    const responses = await this.npsRepository.find({
      where: { surveyPeriod: period },
    });

    const total = responses.length;
    const promoters = responses.filter((r) => r.score >= 9).length;
    const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter((r) => r.score <= 6).length;

    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

    return {
      npsScore: Math.round(npsScore),
      promoters,
      passives,
      detractors,
      total,
    };
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${quarter}`;
  }
}
