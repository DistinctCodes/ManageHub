import { Controller, Get, Post, Body, Param, Put, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  async findForUser(@Req() req: any) {
    const userId = req.user?.id;
    return { success: true, data: await this.notificationsService.findByUser(userId) };
  }

  // System/admin endpoint to create a notification
  @Post()
  @ApiOperation({ summary: 'Create a notification (system/admin)' })
  async create(@Body() dto: CreateNotificationDto) {
    const notif = await this.notificationsService.create(dto);
    return { success: true, data: notif };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string) {
    const notif = await this.notificationsService.markAsRead(id);
    return { success: true, data: notif };
  }
}
