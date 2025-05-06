import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { EmailService } from './email.service';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, WebsocketGateway],
  exports: [NotificationService],
})
export class NotificationsModule {}