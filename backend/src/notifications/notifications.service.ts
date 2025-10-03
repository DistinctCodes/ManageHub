import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notif = this.repo.create({
      userId: dto.userId,
      message: dto.message,
      isRead: dto.isRead ?? false,
    });

    return this.repo.save(notif);
  }

  async findByUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async markAsRead(id: string) {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.isRead = true;
    return this.repo.save(notif);
  }
}
