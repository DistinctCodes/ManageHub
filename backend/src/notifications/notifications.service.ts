import { Injectable } from '@nestjs/common';
import { CreateNotificationProvider } from './providers/create-notification.provider';
import { GetNotificationsProvider, PaginatedNotificationsResult } from './providers/get-notifications.provider';
import { MarkNotificationReadProvider } from './providers/mark-notification-read.provider';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly createNotificationProvider: CreateNotificationProvider,
    private readonly getNotificationsProvider: GetNotificationsProvider,
    private readonly markNotificationReadProvider: MarkNotificationReadProvider,
  ) {}

  notify(dto: CreateNotificationDto): Promise<Notification> {
    return this.createNotificationProvider.notify(dto);
  }

  findAll(userId: string, query: NotificationQueryDto): Promise<PaginatedNotificationsResult> {
    return this.getNotificationsProvider.findAll(userId, query);
  }

  markAsRead(id: string, userId: string): Promise<Notification> {
    return this.markNotificationReadProvider.markAsRead(id, userId);
  }

  markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    return this.markNotificationReadProvider.markAllAsRead(userId);
  }
}
