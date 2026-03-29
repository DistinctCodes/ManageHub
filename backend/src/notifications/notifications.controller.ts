import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated notifications for the current member',
    description:
      'Returns a paginated list of notifications and a separate unreadCount for the bell badge.',
  })
  async findAll(
    @Query() query: NotificationQueryDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const result = await this.notificationsService.findAll(userId, query);
    return {
      message: 'Notifications retrieved successfully',
      data: result.data,
      meta: result.meta,
      unreadCount: result.unreadCount,
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a single notification as read',
    description:
      'Marks the notification with the given ID as read. Returns 403 if the notification does not belong to the requesting user.',
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read', data: notification };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Marks every unread notification belonging to the current user as read.',
  })
  async markAllAsRead(@GetCurrentUser('id') userId: string) {
    const result = await this.notificationsService.markAllAsRead(userId);
    return {
      message: 'All notifications marked as read',
      data: result,
    };
  }
}
