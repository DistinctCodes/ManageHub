import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { EmailService } from './email.service';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private emailService: EmailService,
    private websocketGateway: WebsocketGateway,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(createNotificationDto);
    await this.notificationsRepository.save(notification);

    // Send email notification if requested
    if (createNotificationDto.sendEmail) {
      await this.emailService.sendNotificationEmail(notification);
    }

    // Send real-time notification via WebSocket if requested
    if (createNotificationDto.sendRealtime) {
      this.websocketGateway.sendNotification(notification.recipientId, notification);
    }

    return notification;
  }

  async findAllByUserId(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id } });
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  // Helper methods for common notification types
  async notifyWorkspaceReservation(userId: string, message: string): Promise<Notification> {
    return this.createNotification({
      recipientId: userId,
      message,
      type: NotificationType.WORKSPACE_RESERVATION,
      sendEmail: true,
      sendRealtime: true,
    });
  }

  async notifySubscriptionUpdate(userId: string, message: string): Promise<Notification> {
    return this.createNotification({
      recipientId: userId,
      message,
      type: NotificationType.SUBSCRIPTION,
      sendEmail: true,
      sendRealtime: true,
    });
  }

  async notifyClockIn(userId: string, message: string): Promise<Notification> {
    return this.createNotification({
      recipientId: userId,
      message,
      type: NotificationType.CLOCK_IN,
      sendEmail: false, // Assuming clock-ins don't need email notifications
      sendRealtime: true,
    });
  }

  async sendAnnouncement(userIds: string[], message: string): Promise<Notification[]> {
    const notifications = [];
    for (const userId of userIds) {
      const notification = await this.createNotification({
        recipientId: userId,
        message,
        type: NotificationType.ANNOUNCEMENT,
        sendEmail: true,
        sendRealtime: true,
      });
      notifications.push(notification);
    }
    return notifications;
  }
}

// email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendNotificationEmail(notification: Notification): Promise<void> {
    // Get user email from somewhere (user service or database)
    // This is a placeholder - replace with actual user email retrieval
    const userEmail = await this.getUserEmail(notification.recipientId);
    
    let subject = 'New Notification';
    
    // Customize subject based on notification type
    switch (notification.type) {
      case NotificationType.WORKSPACE_RESERVATION:
        subject = 'Workspace Reservation Update';
        break;
      case NotificationType.SUBSCRIPTION:
        subject = 'Subscription Status Update';
        break;
      case NotificationType.CLOCK_IN:
        subject = 'Clock-in Confirmation';
        break;
      case NotificationType.ANNOUNCEMENT:
        subject = 'Important Announcement';
        break;
    }
    
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_FROM'),
      to: userEmail,
      subject,
      text: notification.message,
      html: `<p>${notification.message}</p>`,
    });
  }

  // Placeholder method - implement actual user email retrieval
  private async getUserEmail(userId: string): Promise<string> {
    // In a real implementation, you would:
    // 1. Call your UserService to get the user's email
    // 2. Or query the database directly
    // For now, we'll return a dummy email
    return `user-${userId}@example.com`;
  }
}