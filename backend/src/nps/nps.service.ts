import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { NpsSurveyResponse } from './entities/nps-survey-response.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { RespondNpsDto } from './dto/respond-nps.dto';
import { NpsQueryDto } from './dto/nps-query.dto';
import { NPS_QUEUE, NPS_SEND_JOB, NpsSurveyJobData } from './nps-survey.processor';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class NpsService {
  private readonly logger = new Logger(NpsService.name);

  constructor(
    @InjectRepository(NpsSurveyResponse)
    private readonly npsRepo: Repository<NpsSurveyResponse>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspacesRepo: Repository<Workspace>,
    @InjectQueue(NPS_QUEUE)
    private readonly npsQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async scheduleIfEligible(
    userId: string,
    bookingId: string,
    workspaceId: string,
    startDate: string,
  ): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [recentSurvey, existingForBooking, user, workspace] = await Promise.all([
      this.npsRepo.findOne({
        where: { userId, createdAt: MoreThanOrEqual(thirtyDaysAgo) },
        order: { createdAt: 'DESC' },
      }),
      this.npsRepo.findOne({ where: { bookingId } }),
      this.usersRepo.findOne({ where: { id: userId } }),
      this.workspacesRepo.findOne({ where: { id: workspaceId } }),
    ]);

    if (recentSurvey || existingForBooking || !user || !workspace) {
      return;
    }

    const record = this.npsRepo.create({ userId, bookingId, score: null, comment: null, submittedAt: null });
    await this.npsRepo.save(record);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const surveyUrl = `${frontendUrl}/nps/${bookingId}`;

    const jobData: NpsSurveyJobData = {
      bookingId,
      userEmail: user.email,
      userName: user.fullName,
      workspaceName: workspace.name,
      bookingDate: startDate,
      surveyUrl,
    };

    await this.npsQueue.add(NPS_SEND_JOB, jobData, { delay: TWO_HOURS_MS });
    this.logger.log(`NPS survey queued for booking ${bookingId} (user ${userId})`);
  }

  async respond(currentUserId: string, dto: RespondNpsDto): Promise<NpsSurveyResponse> {
    const { bookingId, score, comment } = dto;

    const record = await this.npsRepo.findOne({ where: { bookingId } });
    if (!record) {
      throw new NotFoundException('No survey found for this booking');
    }
    if (record.userId !== currentUserId) {
      throw new ForbiddenException('This survey does not belong to you');
    }
    if (record.submittedAt !== null) {
      throw new ConflictException('You have already responded to this survey');
    }

    record.score = score;
    record.comment = comment ?? null;
    record.submittedAt = new Date();
    return this.npsRepo.save(record);
  }

  async getSummary(): Promise<{
    averageScore: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    npsScore: number;
    totalResponses: number;
    recentComments: { score: number; comment: string; submittedAt: Date }[];
  }> {
    const responses = await this.npsRepo
      .createQueryBuilder('r')
      .where('r.submittedAt IS NOT NULL')
      .getMany();

    const total = responses.length;
    if (total === 0) {
      return {
        averageScore: null,
        promoters: 0,
        passives: 0,
        detractors: 0,
        npsScore: 0,
        totalResponses: 0,
        recentComments: [],
      };
    }

    let scoreSum = 0;
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    for (const r of responses) {
      scoreSum += r.score;
      if (r.score >= 9) promoters++;
      else if (r.score >= 7) passives++;
      else detractors++;
    }

    const npsScore = Math.round(((promoters - detractors) / total) * 100);

    const recentComments = responses
      .filter((r) => r.comment)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, 10)
      .map((r) => ({ score: r.score, comment: r.comment, submittedAt: r.submittedAt }));

    return {
      averageScore: Math.round((scoreSum / total) * 10) / 10,
      promoters,
      passives,
      detractors,
      npsScore,
      totalResponses: total,
      recentComments,
    };
  }

  async getResponses(query: NpsQueryDto): Promise<{
    data: NpsSurveyResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    const [data, total] = await this.npsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .select([
        'r',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
      ])
      .where('r.submittedAt IS NOT NULL')
      .orderBy('r.submittedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
