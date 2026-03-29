import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkNotificationReadProvider {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this notification',
      );
    }

    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const unreadNotifications = await this.notificationRepository.find({
      where: { userId, isRead: false },
    });

    if (unreadNotifications.length === 0) {
      return { updatedCount: 0 };
    }

    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return { updatedCount: unreadNotifications.length };
  }
}
