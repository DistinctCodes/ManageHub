import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationQueryDto } from '../dto/notification-query.dto';

@Injectable()
export class FindNotificationsProvider {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findAll(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{
    data: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.notificationsRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    if (query.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: query.isRead });
    }

    qb.orderBy('n.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const unreadCount = await this.notificationsRepository.count({
      where: { userId, isRead: false },
    });

    return { data, total, unreadCount, page, limit };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}
