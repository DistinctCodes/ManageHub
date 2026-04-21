import { Injectable } from '@nestjs/common';
import {
  CreateNotificationProvider,
  CreateNotificationInput,
} from './providers/create-notification.provider';
import { FindNotificationsProvider } from './providers/find-notifications.provider';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly createNotificationProvider: CreateNotificationProvider,
    private readonly findNotificationsProvider: FindNotificationsProvider,
  ) {}

  create(input: CreateNotificationInput) {
    return this.createNotificationProvider.create(input);
  }

  findAll(userId: string, query: NotificationQueryDto) {
    return this.findNotificationsProvider.findAll(userId, query);
  }

  markRead(notificationId: string, userId: string) {
    return this.findNotificationsProvider.markRead(notificationId, userId);
  }

  markAllRead(userId: string) {
    return this.findNotificationsProvider.markAllRead(userId);
  }
}
