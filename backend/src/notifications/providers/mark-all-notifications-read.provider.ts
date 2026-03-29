import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkAllNotificationsReadProvider {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async markAllAsRead(userId: string): Promise<{ success: boolean; message: string }> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}
