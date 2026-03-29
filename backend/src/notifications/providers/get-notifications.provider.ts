import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationQueryDto } from '../dto/notification-query.dto';

export interface PaginatedNotificationsResult {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount: number;
}

@Injectable()
export class GetNotificationsProvider {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsResult> {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: { userId: string; isRead?: boolean } = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }
}
