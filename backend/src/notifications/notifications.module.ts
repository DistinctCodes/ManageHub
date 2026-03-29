import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CreateNotificationProvider } from './providers/create-notification.provider';
import { GetNotificationsProvider } from './providers/get-notifications.provider';
import { MarkNotificationReadProvider } from './providers/mark-notification-read.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    CreateNotificationProvider,
    GetNotificationsProvider,
    MarkNotificationReadProvider,
  ],
  /**
   * CreateNotificationProvider is exported so that other modules
   * (e.g. BookingsModule, PaymentsModule) can inject it to fire
   * in-app notifications after key events without duplicating logic.
   */
  exports: [CreateNotificationProvider],
})
export class NotificationsModule {}
