import { Controller, HttpCode, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
@Controller('sandbox')
@UseGuards(JwtAuthGuard)
export class NotificationReadAllController {
  @WebSocketServer()
  private server: Server;

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: any) {
    const userId: string = req.user.id;

    const unread = await this.notifications.find({
      where: { userId, isRead: false },
    });

    if (unread.length === 0) return { updated: 0 };

    await this.notifications.update(
      { userId, isRead: false },
      { isRead: true },
    );

    this.server?.to(userId).emit('notifications:all-read', { updated: unread.length });

    return { updated: unread.length };
  }
}
