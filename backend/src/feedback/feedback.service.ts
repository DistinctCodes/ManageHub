import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackType } from './enums/feedback-type.enum';
import { FeedbackStatus } from './enums/feedback-status.enum';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  async create(dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepo.create({
      ...dto,
      userId: dto.userId || null,
    });

    const saved = await this.feedbackRepo.save(feedback);
    this.logger.log(`Feedback created: ${saved.id} by user: ${saved.userId || 'anonymous'}`);
    return saved;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    type?: FeedbackType,
    status?: FeedbackStatus,
  ): Promise<{ data: Feedback[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const qb = this.feedbackRepo.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .select([
        'feedback.id',
        'feedback.type',
        'feedback.subject',
        'feedback.body',
        'feedback.rating',
        'feedback.status',
        'feedback.adminNote',
        'feedback.createdAt',
        'feedback.updatedAt',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
      ])
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      qb.andWhere('feedback.type = :type', { type });
    }

    if (status) {
      qb.andWhere('feedback.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async updateStatus(id: string, dto: UpdateFeedbackStatusDto): Promise<Feedback> {
    const feedback = await this.findOne(id);

    feedback.status = dto.status;
    feedback.adminNote = dto.adminNote || null;

    const updated = await this.feedbackRepo.save(feedback);
    this.logger.log(`Feedback ${id} status updated to ${dto.status}`);
    return updated;
  }

  async getStats(): Promise<{
    counts: Record<FeedbackType | 'total', number>;
    averageRating: number | null;
    statusCounts: Record<FeedbackStatus, number>;
  }> {
    const feedbackRepo = this.feedbackRepo;

    // Get counts by type
    const typeCounts = await feedbackRepo
      .createQueryBuilder('feedback')
      .select('feedback.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('feedback.type')
      .getRawMany();

    const counts: Record<FeedbackType | 'total', number> = {
      [FeedbackType.BUG]: 0,
      [FeedbackType.FEATURE_REQUEST]: 0,
      [FeedbackType.GENERAL]: 0,
      [FeedbackType.RATING]: 0,
      total: 0,
    };

    for (const row of typeCounts) {
      const type = row.type as FeedbackType;
      if (type && counts.hasOwnProperty(type)) {
        counts[type] = parseInt(row.count, 10);
        counts.total += parseInt(row.count, 10);
      }
    }

    // Get average rating
    const ratingResult = await feedbackRepo
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'avgRating')
      .where('feedback.rating IS NOT NULL')
      .andWhere('feedback.type = :type', { type: FeedbackType.RATING })
      .getRawOne();

    const averageRating = ratingResult?.avgRating
      ? parseFloat(ratingResult.avgRating)
      : null;

    // Get status counts
    const statusCountsResult = await feedbackRepo
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('feedback.status')
      .getRawMany();

    const statusCounts: Record<FeedbackStatus, number> = {
      [FeedbackStatus.OPEN]: 0,
      [FeedbackStatus.IN_REVIEW]: 0,
      [FeedbackStatus.RESOLVED]: 0,
      [FeedbackStatus.CLOSED]: 0,
    };

    for (const row of statusCountsResult) {
      const status = row.status as FeedbackStatus;
      if (status && statusCounts.hasOwnProperty(status)) {
        statusCounts[status] = parseInt(row.count, 10);
      }
    }

    return { counts, averageRating, statusCounts };
  }
}
