import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';

/**
 * Internal-only provider for persisting notification records.
 * Has no HTTP endpoint — call notify() from any module that needs
 * to surface an in-app notification to a member.
 *
 * Must be injected via NotificationsModule (which exports this provider).
 */
@Injectable()
export class CreateNotificationProvider {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Persist a new notification for the given user.
   * @param dto - userId, type, title, message, and optional metadata
   * @returns The saved Notification record
   */
  async notify(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata,
    });

    return this.notificationRepository.save(notification);
  }
}
